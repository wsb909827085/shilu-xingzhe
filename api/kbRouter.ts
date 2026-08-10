import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { createRouter, publicQuery, editorQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { media, nodes, poems, poets, tourStops } from "@db/schema";

/* ---------- 输入校验 ---------- */

const nodeInput = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  lon: z.number(),
  lat: z.number(),
  highlight: z.boolean().optional(),
  note: z.string().optional().nullable(),
  source: z.string().max(512).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const poetInput = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  dynasty: z.string().min(1).max(32),
  years: z.string().max(64).optional().nullable(),
  era: z.string().max(255).optional().nullable(),
  color: z.string().max(16).optional(),
  summary: z.string().optional().nullable(),
  /** 行迹节点 slug 数组 */
  route: z.array(z.string()).optional(),
  startYear: z.number().int().optional().nullable(),
  image: z.string().max(255).optional().nullable(),
  source: z.string().max(512).optional().nullable(),
  /** 200-500字过岭经历详述 */
  detail: z.string().optional().nullable(),
  /** 生平年表 JSON [{year, event}] */
  chronicle: z.string().optional().nullable(),
  aiPortrait: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const poemInput = z.object({
  poetSlug: z.string().min(1),
  nodeSlug: z.string().max(64).optional().nullable(),
  title: z.string().min(1).max(255),
  lines: z.string().min(1),
  note: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  background: z.string().optional().nullable(),
  source: z.string().max(512).optional().nullable(),
  extUrl: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

/* ---------- CSV / Excel 解析 ---------- */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * 统一表格入口：支持 CSV 文本 或 xlsx 文件（base64，取自「数据」工作表）。
 * 返回带表头的行列。
 */
function tableRows(input: { csv?: string; xlsx?: string; sheet?: string }): string[][] {
  if (input.xlsx) {
    const wb = XLSX.read(Buffer.from(input.xlsx, "base64"), { type: "buffer" });
    const name = input.sheet && wb.SheetNames.includes(input.sheet) ? input.sheet : wb.SheetNames[0];
    const ws = wb.Sheets[name];
    return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  }
  if (input.csv) return parseCsv(input.csv);
  throw new TRPCError({ code: "BAD_REQUEST", message: "需要 csv 文本或 xlsx 文件" });
}

/** 第一行为表头，按表头名映射到字段 */
function rowsToObjects<T extends z.ZodRawShape>(
  rows: string[][],
  headers: Record<string, keyof T & string>,
  schema: z.ZodObject<T>,
) {
  if (rows.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "表格至少需要表头与一行数据" });
  const head = rows[0].map((h) => String(h).trim());
  const out: z.infer<typeof schema>[] = [];
  const errors: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, unknown> = {};
    for (const [csvName, fieldName] of Object.entries(headers)) {
      const idx = head.indexOf(csvName);
      if (idx >= 0) {
        let v: unknown = String(rows[r][idx] ?? "").trim();
        if (v === "") v = undefined;
        obj[fieldName] = v;
      }
    }
    for (const k of ["lon", "lat", "year", "startYear", "sortOrder"] as const) {
      if (obj[k] !== undefined) {
        const n = Number(obj[k]);
        if (Number.isNaN(n)) delete obj[k];
        else obj[k] = n;
      }
    }
    if (obj.highlight !== undefined) {
      obj.highlight = ["1", "true", "是", "TRUE"].includes(String(obj.highlight));
    }
    if (obj.route !== undefined && typeof obj.route === "string") {
      obj.route = (obj.route as string)
        .split(/[;；|]/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
    const parsed = schema.safeParse(obj);
    if (parsed.success) out.push(parsed.data);
    else errors.push(`第 ${r + 1} 行: ${parsed.error.issues[0]?.message ?? "校验失败"}`);
  }
  return { items: out, errors };
}

async function poetIdBySlug(slug: string) {
  const p = (await getDb().select().from(poets).where(eq(poets.slug, slug)).limit(1)).at(0);
  if (!p) throw new TRPCError({ code: "BAD_REQUEST", message: `诗人不存在: ${slug}` });
  return p.id;
}

/* ---------- 素材文件保存 ---------- */

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function saveDataUrl(dataUrl: string, subdir: string): string {
  const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!m) throw new TRPCError({ code: "BAD_REQUEST", message: "文件格式不正确" });
  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  const ext =
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[mime];
  if (!ext) throw new TRPCError({ code: "BAD_REQUEST", message: `不支持的文件类型：${mime}` });
  const dir = path.join(UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `/uploads/${subdir}/${name}`;
}

/* ---------- 表头映射（与 Excel 模板一致） ---------- */

const NODE_HEADERS = { slug: "slug", 名称: "name", 经度: "lon", 纬度: "lat", 重点: "highlight", 备注: "note", 来源: "source", 排序: "sortOrder" } as const;
const POET_HEADERS = { slug: "slug", 姓名: "name", 朝代: "dynasty", 生卒年: "years", 贬谪时期: "era", 颜色: "color", 简介: "summary", 行迹: "route", 贬谪起始年: "startYear", 详述: "detail", 年表: "chronicle", 画像: "aiPortrait", 来源: "source", 排序: "sortOrder" } as const;
const POEM_HEADERS = { 诗人: "poetSlug", 节点: "nodeSlug", 标题: "title", 诗句: "lines", 注释: "note", 年份: "year", 背景: "background", 来源: "source", 外链: "extUrl", 排序: "sortOrder" } as const;

/* ---------- 路由 ---------- */

/* kb.all 60s 缓存（降低 DB 压力，知识库更新后由 invalidate 自然过期） */
let allCache: { data: unknown; ts: number } | null = null;
async function cachedAll() {
  const now = Date.now();
  if (allCache && now - allCache.ts < 60_000) return allCache.data;
  const db = getDb();
  const [nodeList, poetList, poemList, mediaList] = await Promise.all([
    db.select().from(nodes).orderBy(asc(nodes.sortOrder), asc(nodes.id)),
    db.select().from(poets).orderBy(asc(poets.sortOrder), asc(poets.id)),
    db.select().from(poems).orderBy(asc(poems.sortOrder), asc(poems.id)),
    db.select().from(media).where(eq(media.status, "approved")).orderBy(asc(media.id)),
  ]);
  const data = {
    nodes: nodeList,
    poets: poetList.map((p) => ({ ...p, route: p.route ? (JSON.parse(p.route) as string[]) : [] })),
    poems: poemList,
    media: mediaList,
  };
  allCache = { data, ts: now };
  return data;
}

export const kbRouter = createRouter({
  /** 全量知识库（公开：地图与 AI 上下文用）。60s 服务端缓存 */
  all: publicQuery.query(async () => cachedAll()),

  /** 诗人导览站解说（公开；按诗人 slug 返回按 seq 排序的解说） */
  tour: publicQuery
    .input(z.object({ poetSlug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(tourStops)
        .where(eq(tourStops.poetSlug, input.poetSlug))
        .orderBy(asc(tourStops.seq));
    }),

  /* ----- Excel 模板导出（含当前全部数据，作为人工收录标准） ----- */
  exportExcel: editorQuery.query(async () => {
    const db = getDb();
    const [nodeList, poetList, poemList] = await Promise.all([
      db.select().from(nodes).orderBy(asc(nodes.sortOrder), asc(nodes.id)),
      db.select().from(poets).orderBy(asc(poets.sortOrder), asc(poets.id)),
      db.select().from(poems).orderBy(asc(poems.sortOrder), asc(poems.id)),
    ]);
    const poetSlugById = new Map(poetList.map((p) => [p.id, p.slug]));

    const wb = XLSX.utils.book_new();
    const guide = [
      ["诗路行者知识库收录标准"],
      ["1. 三个工作表分别对应：诗人 / 诗作 / 节点，表头不可改动"],
      ["2. slug 使用中文（如 梅关、韶州），诗人表 slug 用拼音（如 sushi）"],
      ["3. 行迹列填节点 slug，以 ; 分隔，按时间顺序"],
      ["4. 年表列填 JSON：[{\"year\":1094,\"event\":\"贬惠州\"}]"],
      ["5. 来源列必填，格式如《全唐诗》卷五十二 /《宋史》卷三三八"],
      ["6. 外链列填古诗文网诗作直达链接（shiwenv_ 开头页面）"],
      ["7. 收录完成后上传本文件，经管理员审核后入库"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), "收录说明");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        poetList.map((p) => ({
          slug: p.slug, 姓名: p.name, 朝代: p.dynasty, 生卒年: p.years ?? "", 贬谪时期: p.era ?? "",
          颜色: p.color, 简介: p.summary ?? "",
          行迹: p.route ? (JSON.parse(p.route) as string[]).join(";") : "",
          贬谪起始年: p.startYear ?? "", 详述: p.detail ?? "", 年表: p.chronicle ?? "",
          画像: p.aiPortrait ?? "", 来源: p.source ?? "", 排序: p.sortOrder,
        })),
        { header: Object.keys(POET_HEADERS) },
      ),
      "诗人",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        poemList.map((pm) => ({
          诗人: poetSlugById.get(pm.poetId) ?? pm.poetId, 节点: pm.nodeSlug ?? "", 标题: pm.title,
          诗句: pm.lines, 注释: pm.note ?? "", 年份: pm.year ?? "", 背景: pm.background ?? "",
          来源: pm.source ?? "", 外链: pm.extUrl ?? "", 排序: pm.sortOrder,
        })),
        { header: Object.keys(POEM_HEADERS) },
      ),
      "诗作",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        nodeList.map((n) => ({
          slug: n.slug, 名称: n.name, 经度: n.lon, 纬度: n.lat,
          重点: n.highlight ? "是" : "", 备注: n.note ?? "", 来源: n.source ?? "", 排序: n.sortOrder,
        })),
        { header: Object.keys(NODE_HEADERS) },
      ),
      "节点",
    );
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return { filename: "诗路行者知识库.xlsx", base64: buf.toString("base64") };
  }),

  /* ----- 节点 ----- */
  upsertNode: editorQuery
    .input(nodeInput.extend({ id: z.number().int().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = getDb();
      if (id) {
        await db.update(nodes).set(data).where(eq(nodes.id, id));
        return { id };
      }
      const [r] = await db.insert(nodes).values(data).$returningId();
      return { id: r.id };
    }),
  deleteNode: editorQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await getDb().delete(nodes).where(eq(nodes.id, input.id));
      return { ok: true };
    }),

  /* ----- 诗人 ----- */
  upsertPoet: editorQuery
    .input(poetInput.extend({ id: z.number().int().optional() }))
    .mutation(async ({ input }) => {
      const { id, route, ...data } = input;
      const values = { ...data, route: route ? JSON.stringify(route) : null };
      const db = getDb();
      if (id) {
        await db.update(poets).set(values).where(eq(poets.id, id));
        return { id };
      }
      const [r] = await db.insert(poets).values(values).$returningId();
      return { id: r.id };
    }),
  deletePoet: editorQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await getDb().delete(poets).where(eq(poets.id, input.id));
      return { ok: true };
    }),

  /* ----- 诗作 ----- */
  upsertPoem: editorQuery
    .input(poemInput.extend({ id: z.number().int().optional() }))
    .mutation(async ({ input }) => {
      const { id, poetSlug, ...data } = input;
      const poetId = await poetIdBySlug(poetSlug);
      const db = getDb();
      if (id) {
        await db.update(poems).set({ ...data, poetId }).where(eq(poems.id, id));
        return { id };
      }
      const [r] = await db.insert(poems).values({ ...data, poetId }).$returningId();
      return { id: r.id };
    }),
  deletePoem: editorQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await getDb().delete(poems).where(eq(poems.id, input.id));
      return { ok: true };
    }),

  /* ----- 批量导入（CSV 文本或 xlsx 文件） ----- */
  importNodes: editorQuery
    .input(z.object({ csv: z.string().optional(), xlsx: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { items, errors } = rowsToObjects(tableRows(input), NODE_HEADERS, nodeInput);
      const db = getDb();
      let count = 0;
      for (const it of items) {
        await db
          .insert(nodes)
          .values(it)
          .onDuplicateKeyUpdate({ set: { name: it.name, lon: it.lon, lat: it.lat, highlight: it.highlight ?? false, note: it.note ?? null, source: it.source ?? null, sortOrder: it.sortOrder ?? 0 } });
        count++;
      }
      return { count, errors };
    }),
  importPoets: editorQuery
    .input(z.object({ csv: z.string().optional(), xlsx: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { items, errors } = rowsToObjects(tableRows(input), POET_HEADERS, poetInput);
      const db = getDb();
      let count = 0;
      for (const it of items) {
        const { route, ...rest } = it;
        const routeStr = route ? JSON.stringify(route) : null;
        await db
          .insert(poets)
          .values({ ...rest, route: routeStr })
          .onDuplicateKeyUpdate({ set: { name: it.name, dynasty: it.dynasty, years: it.years ?? null, era: it.era ?? null, color: it.color ?? "#d4a24e", summary: it.summary ?? null, route: routeStr, startYear: it.startYear ?? null, detail: it.detail ?? null, chronicle: it.chronicle ?? null, aiPortrait: it.aiPortrait ?? null, source: it.source ?? null, sortOrder: it.sortOrder ?? 0 } });
        count++;
      }
      return { count, errors };
    }),
  importPoems: editorQuery
    .input(z.object({ csv: z.string().optional(), xlsx: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { items, errors } = rowsToObjects(tableRows(input), POEM_HEADERS, poemInput);
      const db = getDb();
      let count = 0;
      for (const it of items) {
        const { poetSlug, ...rest } = it;
        const poetId = await poetIdBySlug(poetSlug);
        await db.insert(poems).values({ ...rest, poetId });
        count++;
      }
      return { count, errors };
    }),

  /* ----- 素材：上传 / 审核 / 删除 ----- */

  /** 录入员上传素材（图片或视频，dataURL），进入待审核 */
  uploadMedia: editorQuery
    .input(
      z.object({
        poetSlug: z.string().min(1),
        type: z.enum(["image", "video"]),
        title: z.string().min(1).max(128),
        note: z.string().optional().nullable(),
        dataUrl: z.string().min(32),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.dataUrl.length > 45 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "文件过大（上限约 30MB）" });
      }
      const poetId = await poetIdBySlug(input.poetSlug);
      const url = saveDataUrl(input.dataUrl, "media");
      const [r] = await getDb()
        .insert(media)
        .values({ poetId, type: input.type, title: input.title, note: input.note ?? null, url, uploaderId: ctx.user.id })
        .$returningId();
      return { id: r.id, url };
    }),

  /** 全部素材（含待审核）：后台列表 */
  listMedia: editorQuery.query(async () => {
    const db = getDb();
    const [mediaList, poetList] = await Promise.all([
      db.select().from(media).orderBy(desc(media.id)),
      db.select().from(poets),
    ]);
    const poetName = new Map(poetList.map((p) => [p.id, p.name]));
    return mediaList.map((m) => ({ ...m, poetName: poetName.get(m.poetId) ?? "?" }));
  }),

  /** 管理员审核素材 */
  reviewMedia: adminQuery
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["approved", "rejected"]),
        reviewNote: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await getDb()
        .update(media)
        .set({ status: input.status, reviewNote: input.reviewNote ?? null, reviewerId: ctx.user.id, reviewedAt: new Date() })
        .where(eq(media.id, input.id));
      return { ok: true };
    }),

  deleteMedia: editorQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const m = (await db.select().from(media).where(eq(media.id, input.id)).limit(1)).at(0);
      if (m?.url?.startsWith("/uploads/")) {
        try {
          fs.unlinkSync(path.resolve(process.cwd(), m.url.slice(1)));
        } catch { /* 文件可不存在 */ }
      }
      await db.delete(media).where(eq(media.id, input.id));
      return { ok: true };
    }),
});
