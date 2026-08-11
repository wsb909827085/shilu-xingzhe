import * as XLSX from "xlsx";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * KbWorkbook：知识库 Excel/CSV 管道的深模块。
 * 对外暴露：NODE_HEADERS / POET_HEADERS / POEM_HEADERS（中文表头↔字段契约）、
 *           parseTable + rowsToObjects（导入方向）、buildWorkbookBuffer（导出方向）。
 * 对内隐藏：CSV 引号状态机、xlsx 读取、表头索引、类型强制转换（数字/布尔/行迹数组）。
 */

/* ---------- 表头映射（与 Excel 模板一致；导出/导入共用同一契约） ---------- */

export const NODE_HEADERS = { slug: "slug", 名称: "name", 经度: "lon", 纬度: "lat", 重点: "highlight", 备注: "note", 来源: "source", 排序: "sortOrder" } as const;
export const POET_HEADERS = { slug: "slug", 姓名: "name", 朝代: "dynasty", 生卒年: "years", 贬谪时期: "era", 颜色: "color", 简介: "summary", 行迹: "route", 贬谪起始年: "startYear", 详述: "detail", 年表: "chronicle", 画像: "aiPortrait", 来源: "source", 排序: "sortOrder" } as const;
export const POEM_HEADERS = { 诗人: "poetSlug", 节点: "nodeSlug", 标题: "title", 诗句: "lines", 注释: "note", 年份: "year", 背景: "background", 来源: "source", 外链: "extUrl", 排序: "sortOrder" } as const;

/* ---------- 导入方向 ---------- */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
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
 * 统一表格入口：支持 CSV 文本 或 xlsx 文件（base64，取自指定或首个工作表）。
 * 返回带表头的行列。
 */
export function parseTable(input: { csv?: string; xlsx?: string; sheet?: string }): string[][] {
  if (input.xlsx) {
    const wb = XLSX.read(Buffer.from(input.xlsx, "base64"), { type: "buffer" });
    const name = input.sheet && wb.SheetNames.includes(input.sheet) ? input.sheet : wb.SheetNames[0];
    const ws = wb.Sheets[name];
    return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  }
  if (input.csv) return parseCsv(input.csv);
  throw new TRPCError({ code: "BAD_REQUEST", message: "需要 csv 文本或 xlsx 文件" });
}

/** 第一行为表头，按表头名映射到字段并做 zod 校验 */
export function rowsToObjects<T extends z.ZodRawShape>(
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

/* ---------- 导出方向 ---------- */

/** 生成知识库 Excel 模板（收录说明 + 三张数据表），返回 xlsx Buffer */
export function buildWorkbookBuffer(sheets: { name: string; aoa: unknown[][] }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** 收录说明页内容（单一出处，便于维护） */
export const IMPORT_GUIDE_AOA: unknown[][] = [
  ["诗路行者知识库收录标准"],
  ["1. 三个工作表分别对应：诗人 / 诗作 / 节点，表头不可改动"],
  ["2. slug 使用中文（如 梅关、韶州），诗人表 slug 用拼音（如 sushi）"],
  ["3. 行迹列填节点 slug，以 ; 分隔，按时间顺序"],
  ["4. 年表列填 JSON：[{\"year\":1094,\"event\":\"贬惠州\"}]"],
  ["5. 来源列必填，格式如《全唐诗》卷五十二 /《宋史》卷三三八"],
  ["6. 外链列填古诗文网诗作直达链接（shiwenv_ 开头页面）"],
  ["7. 收录完成后上传本文件，经管理员审核后入库"],
];

/** 按表头契约把对象数组转成 aoa（首行中文表头，行序与表头一致） */
export function objectsSheet(
  headers: Record<string, string>,
  rows: Record<string, unknown>[],
): unknown[][] {
  const cols = Object.keys(headers);
  return [cols, ...rows.map((r) => cols.map((c) => r[c] ?? ""))];
}
