import * as crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { env } from "./env";
import { getDb } from "../queries/connection";
import { aiKeys } from "@db/schema";

/**
 * LlmGateway：LLM 调用的深模块。
 * 对外只暴露三个入口：resolveKey / chatCompletion / extractJson。
 * 对内隐藏：API Key 的 AES-256-GCM 加解密、提供商默认配置、
 * 登录用户/游客 Key 解析、chat/completions 协议细节、JSON 提取。
 */

/* ---------- 提供商配置 ---------- */

export const PROVIDERS = {
  kimi: { baseUrl: "https://api.moonshot.cn/v1", model: "kimi-k2-0711-preview", guide: "platform.moonshot.cn → 用户中心 → API Key 管理" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", guide: "platform.deepseek.com → API keys" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", guide: "platform.openai.com → API keys" },
  custom: { baseUrl: "", model: "", guide: "填写你的中转站 Base URL 与模型名即可（兼容 OpenAI 接口格式）" },
} as const;

export type Provider = keyof typeof PROVIDERS;

export interface LlmCredentials {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/* ---------- API Key 加解密（AES-256-GCM，密钥派生自 APP_SECRET） ---------- */

const KEY = crypto.scryptSync(env.appSecret, "shilu-ai-key-salt", 32);

export function encryptKey(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptKey(stored: string) {
  const [ivB, tagB, dataB] = stored.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

export function maskKey(k: string) {
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/* ---------- Key 解析：登录用户读库，游客用自带 Key ---------- */

export async function resolveKey(
  userId: number | null,
  provider: Provider,
  guestKey?: string,
): Promise<LlmCredentials> {
  let apiKey = guestKey ?? "";
  let baseUrl: string = PROVIDERS[provider].baseUrl;
  let model: string = PROVIDERS[provider].model;

  if (userId && !apiKey) {
    const row = (
      await getDb()
        .select()
        .from(aiKeys)
        .where(and(eq(aiKeys.userId, userId), eq(aiKeys.provider, provider)))
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
  return { apiKey, baseUrl, model };
}

/* ---------- chat/completions 调用 ---------- */

export async function chatCompletion(
  cred: LlmCredentials,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { temperature?: number; timeoutMs?: number } = {},
): Promise<string> {
  const res = await fetch(`${cred.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cred.apiKey}` },
    body: JSON.stringify({
      model: cred.model,
      messages,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60000),
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
  return reply;
}

/* ---------- 从模型输出中提取首个 JSON 对象 ---------- */

export function extractJson<T>(raw: string, retryHint = "请重试"): T {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI 未返回有效 JSON，${retryHint}` });
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI 返回的 JSON 解析失败，${retryHint}` });
  }
}

/* ---------- 简易联网搜索（DuckDuckGo Instant Answer，尽力而为） ---------- */

export async function webSearch(query: string): Promise<string> {
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
