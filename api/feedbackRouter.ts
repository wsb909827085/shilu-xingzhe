import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { feedbacks } from "@db/schema";
import { TRPCError } from "@trpc/server";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/** 保存 dataURL 图片到 uploads/，返回可访问路径 */
function saveImage(dataUrl: string): string {
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new TRPCError({ code: "BAD_REQUEST", message: "图片格式不支持" });
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 5 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "单张图片不能超过 5MB" });
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

export const feedbackRouter = createRouter({
  /** 登录用户提交反馈（图片以 dataURL 上传，最多 4 张） */
  submit: authedQuery
    .input(
      z.object({
        category: z.enum(["correction", "suggestion", "data", "other"]),
        module: z.enum(["map", "poet", "poem", "node", "event", "relation", "ai", "other"]),
        target: z.string().max(128).optional().nullable(),
        content: z.string().min(1).max(5000),
        contactEmail: z.string().email().optional().nullable().or(z.literal("")),
        images: z.array(z.string()).max(4).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const paths = (input.images ?? []).map(saveImage);
      await getDb()
        .insert(feedbacks)
        .values({
          userId: ctx.user.id,
          category: input.category,
          module: input.module,
          target: input.target || null,
          content: input.content,
          contactEmail: input.contactEmail || null,
          images: paths.length ? JSON.stringify(paths) : null,
        });
      return { ok: true };
    }),

  /** 管理员：反馈列表 */
  list: adminQuery.query(async () => {
    const rows = await getDb().select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
    return rows.map((r) => ({
      ...r,
      images: r.images ? (JSON.parse(r.images) as string[]) : [],
    }));
  }),

  /** 管理员：标记状态 unread/read/resolved */
  setStatus: adminQuery
    .input(z.object({ id: z.number().int(), status: z.enum(["unread", "read", "resolved"]) }))
    .mutation(async ({ input }) => {
      await getDb().update(feedbacks).set({ status: input.status }).where(eq(feedbacks.id, input.id));
      return { ok: true };
    }),
});
