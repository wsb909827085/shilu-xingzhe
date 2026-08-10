import { z } from "zod";
import { and, eq } from "drizzle-orm";
import * as crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, editorQuery } from "./middleware";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { aiKeys, nodes, poems, poets } from "@db/schema";

/* ---------- API Key 加解密（AES-256-GCM，密钥派生自 APP_SECRET） ---------- */

const KEY = crypto.scryptSync(env.appSecret, "shilu-ai-key-salt", 32);

function encryptKey(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

function decryptKey(stored: string) {
  const [ivB, tagB, dataB] = stored.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

function maskKey(k: string) {
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/* ---------- 提供商配置 ---------- */

const PROVIDERS = {
  kimi: { baseUrl: "https://api.moonshot.cn/v1", model: "kimi-k2-0711-preview", guide: "platform.moonshot.cn → 用户中心 → API Key 管理" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", guide: "platform.deepseek.com → API keys" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", guide: "platform.openai.com → API keys" },
  custom: { baseUrl: "", model: "", guide: "填写你的中转站 Base URL 与模型名即可（兼容 OpenAI 接口格式）" },
} as const;

type Provider = keyof typeof PROVIDERS;

/* ---------- 简易联网搜索（DuckDuckGo Instant Answer，尽力而为） ---------- */

async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&kl=cn-zh`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = (await res.json()) as {
      AbstractText?: string;
      RelatedTopics?: { Text?: string }[];
    };
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    for (const t of (data.RelatedTopics ?? []).slice(0, 5)) {
      if (t.Text) parts.push(t.Text);
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

/* ---------- 知识库上下文 ---------- */

async function buildKbContext() {
  const db = getDb();
  const [poetList, nodeList, poemList] = await Promise.all([
    db.select().from(poets),
    db.select().from(nodes),
    db.select().from(poems),
  ]);
  const poetName = new Map(poetList.map((p) => [p.id, p.name]));
  const nodeName = new Map(nodeList.map((n) => [n.slug, n.name]));
  const parts: string[] = ["【知识库·诗人】"];
  for (const p of poetList) {
    const route = p.route ? (JSON.parse(p.route) as string[]) : [];
    parts.push(
      `· ${p.name}（${p.dynasty}，${p.years ?? "生卒不详"}）${p.era ?? ""}：${p.summary ?? ""}` +
        (route.length ? `｜行迹：${route.map((s) => nodeName.get(s) ?? s).join("→")}` : "") +
        (p.source ? `｜来源：${p.source}` : ""),
    );
  }
  parts.push("【知识库·节点】");
  for (const n of nodeList) {
    parts.push(`· ${n.name}（${n.lon}, ${n.lat}）${n.note ?? ""}${n.source ? `｜来源：${n.source}` : ""}`);
  }
  parts.push("【知识库·诗作】");
  for (const p of poemList) {
    parts.push(
      `· 《${p.title}》${poetName.get(p.poetId) ?? ""}${p.year ? `（${p.year}年）` : ""}${p.nodeSlug ? `于${nodeName.get(p.nodeSlug) ?? p.nodeSlug}` : ""}：${p.lines}${p.source ? `｜来源：${p.source}` : ""}`,
    );
  }
  return parts.join("\n");
}

const SYSTEM_PROMPT = `你是「诗路行者」数字人文项目的 AI 数字导游。项目主题：唐宋时期贬谪诗人（张九龄、宋之问、寇准、苏轼、苏辙、文天祥等）翻越大庾岭梅关古道的行迹与诗作。
你的职责：
1. 以温文尔雅的向导口吻，引导用户了解诗人的贬谪人生、过岭诗作与沿途地理；
2. 回答关于本项目、梅关古道、唐宋贬谪文化的问题；
3. 优先依据下方知识库内容作答，引用时注明来源；知识库没有的内容可结合你的文史知识，但需说明；
4. 回复使用简体中文，适度分段，引用诗句时使用「」；
5. 当用户尚未选定诗人时，主动推荐探索路径。`;

export const aiRouter = createRouter({
  /** 保存/更新当前用户的 API Key（加密存储；游客传 guestKey 不落库） */
  saveKey: publicQuery
    .input(
      z.object({
        provider: z.enum(["kimi", "deepseek", "openai", "custom"]),
        apiKey: z.string().min(8),
        baseUrl: z.string().url().optional().nullable().or(z.literal("")),
        model: z.string().max(128).optional().nullable().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        // 游客：Key 仅存浏览器，不在服务端保存
        return { saved: false, keyMask: maskKey(input.apiKey) };
      }
      const db = getDb();
      const encrypted = encryptKey(input.apiKey);
      const existing = (
        await db
          .select()
          .from(aiKeys)
          .where(and(eq(aiKeys.userId, ctx.user.id), eq(aiKeys.provider, input.provider)))
          .limit(1)
      ).at(0);
      const values = {
        encryptedKey: encrypted,
        keyMask: maskKey(input.apiKey),
        baseUrl: input.baseUrl || null,
        model: input.model || null,
      };
      if (existing) {
        await db.update(aiKeys).set(values).where(eq(aiKeys.id, existing.id));
      } else {
        await db.insert(aiKeys).values({ userId: ctx.user.id, provider: input.provider, ...values });
      }
      return { saved: true, keyMask: values.keyMask };
    }),

  /** 查询当前用户已保存的 Key（只返回掩码） */
  myKeys: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    const rows = await getDb().select().from(aiKeys).where(eq(aiKeys.userId, ctx.user.id));
    return rows.map((r) => ({ provider: r.provider, keyMask: r.keyMask, baseUrl: r.baseUrl, model: r.model }));
  }),

  deleteKey: publicQuery
    .input(z.object({ provider: z.enum(["kimi", "deepseek", "openai", "custom"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await getDb()
        .delete(aiKeys)
        .where(and(eq(aiKeys.userId, ctx.user.id), eq(aiKeys.provider, input.provider)));
      return { ok: true };
    }),

  /**
   * 对话：上下文 = 预设提示词 + 全量知识库 + 当前选中对象 + （可选）联网搜索。
   * 登录用户用服务端保存的 Key；游客每次请求自带 Key（不落库）。
   */
  chat: publicQuery
    .input(
      z.object({
        provider: z.enum(["kimi", "deepseek", "openai", "custom"]),
        guestKey: z.string().optional(),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(40),
        /** 当前选中对象描述，如 "诗人：苏轼" / "节点：梅关" */
        selection: z.string().max(200).optional(),
        /** 是否附带联网搜索结果 */
        search: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const provider: Provider = input.provider;
      let apiKey = input.guestKey ?? "";
      let baseUrl: string = PROVIDERS[provider].baseUrl;
      let model: string = PROVIDERS[provider].model;

      if (ctx.user && !apiKey) {
        const row = (
          await getDb()
            .select()
            .from(aiKeys)
            .where(and(eq(aiKeys.userId, ctx.user.id), eq(aiKeys.provider, provider)))
            .limit(1)
        ).at(0);
        if (row) {
          apiKey = decryptKey(row.encryptedKey);
          if (row.baseUrl) baseUrl = row.baseUrl;
          if (row.model) model = row.model;
        }
      }
      if (!apiKey) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先填写 API Key" });
      }

      const kb = await buildKbContext();
      let system = `${SYSTEM_PROMPT}\n\n${kb}`;
      if (input.selection) {
        system += `\n\n【用户当前浏览】${input.selection}，请围绕它展开引导。`;
      }
      const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
      if (input.search && lastUser) {
        const result = await webSearch(lastUser.content.slice(0, 120));
        if (result) system += `\n\n【联网搜索结果】\n${result}`;
      }

      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            ...input.messages.slice(-12),
          ],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `模型服务返回 ${res.status}：${text.slice(0, 200)}`,
        });
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "模型未返回内容" });
      return { reply };
    }),

  /**
   * 知识库 AI 自动补齐：填入诗人/诗作/地点名称，自动联网补全其余字段。
   * 返回 JSON 字符串结果，由后台界面预览后人工确认入库。
   */
  autofill: editorQuery
    .input(
      z.object({
        kind: z.enum(["poet", "poem", "node"]),
        query: z.string().min(1).max(200),
        provider: z.enum(["kimi", "deepseek", "openai", "custom"]),
        guestKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const provider: Provider = input.provider;
      let apiKey = input.guestKey ?? "";
      let baseUrl: string = PROVIDERS[provider].baseUrl;
      let model: string = PROVIDERS[provider].model;
      if (ctx.user && !apiKey) {
        const row = (
          await getDb()
            .select()
            .from(aiKeys)
            .where(and(eq(aiKeys.userId, ctx.user.id), eq(aiKeys.provider, provider)))
            .limit(1)
        ).at(0);
        if (row) {
          apiKey = decryptKey(row.encryptedKey);
          if (row.baseUrl) baseUrl = row.baseUrl;
          if (row.model) model = row.model;
        }
      }
      if (!apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "请先在 AI 导游中填写 API Key" });
      if (provider === "custom" && !baseUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "自定义中转站需先保存 Base URL" });
      }

      const schemaHint: Record<string, string> = {
        poet: '{"name":"姓名","dynasty":"唐|北宋|南宋","years":"生卒年","era":"贬谪时期一句话","summary":"百字简介","detail":"诗人与大庾岭关系200-400字","chronicle":"生平年表，每行一条，格式：年份|事件","source":"出处"}',
        poem: '{"title":"诗题","poetName":"诗人","lines":"诗句全文，一句一行","year":创作年(数字),"nodeName":"创作地点名","background":"创作背景100-200字","source":"出处","extUrl":"古诗文网原页链接(不确定则空)"}',
        node: '{"name":"地点名（古称＋今名）","lon":经度(数字),"lat":纬度(数字),"note":"与唐宋贬谪诗人/大庾岭通道相关的介绍100-200字","highlight":是否关键节点(true/false),"source":"出处"}',
      };
      const web = await webSearch(input.query.slice(0, 120));
      const system = `你是严谨的中国文史资料整理员。用户给你一个${{ poet: "诗人", poem: "诗作", node: "地点" }[input.kind]}名称，请基于史实补全信息。
要求：只输出一个 JSON 对象（不要 markdown 代码块、不要解释），字段如下：${schemaHint[input.kind]}
所有内容必须与唐宋贬谪诗人、大庾岭梅关古道相关；不确定的字段宁可留空，不要编造。${web ? `\n参考搜索结果：\n${web}` : ""}`;

      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: input.query },
          ],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new TRPCError({ code: "BAD_REQUEST", message: `模型服务返回 ${res.status}：${text.slice(0, 200)}` });
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 未返回有效 JSON，请重试" });
      let parsed: unknown;
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 返回的 JSON 解析失败，请重试" });
      }
      return { result: parsed as Record<string, unknown> };
    }),
});