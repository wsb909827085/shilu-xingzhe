import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { nodes, poets, poems, videos } from "@db/schema";

/** 全站内容一次性拉取（公开） */
async function getAllContent() {
  const db = getDb();
  const [nodeRows, poetRows, poemRows, videoRows] = await Promise.all([
    db.select().from(nodes).orderBy(asc(nodes.sortOrder)),
    db.select().from(poets).orderBy(asc(poets.sortOrder)),
    db.select().from(poems).orderBy(asc(poems.sortOrder)),
    db.select().from(videos).orderBy(asc(videos.sortOrder)),
  ]);
  return {
    nodes: nodeRows,
    poets: poetRows.map((p) => ({
      ...p,
      route: (() => {
        try {
          return p.route ? (JSON.parse(p.route) as string[]) : [];
        } catch {
          return [];
        }
      })(),
    })),
    poems: poemRows,
    videos: videoRows,
  };
}

const nodeInput = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  lon: z.number(),
  lat: z.number(),
  highlight: z.boolean().optional(),
  note: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const poetInput = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  dynasty: z.string().min(1).max(32),
  years: z.string().max(64).optional(),
  era: z.string().max(255).optional(),
  color: z.string().max(16).optional(),
  summary: z.string().optional(),
  /** 行迹节点 slug 数组，后端存 JSON */
  route: z.array(z.string()).optional(),
  startYear: z.number().int().nullable().optional(),
  image: z.string().max(255).optional(),
  sortOrder: z.number().int().optional(),
});

const poemInput = z.object({
  poetId: z.number(),
  nodeSlug: z.string().max(64).nullable().optional(),
  title: z.string().min(1).max(255),
  lines: z.string().min(1),
  note: z.string().optional(),
  year: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const videoInput = z.object({
  title: z.string().min(1).max(255),
  poetName: z.string().max(64).optional(),
  description: z.string().optional(),
  videoUrl: z.string().max(512).nullable().optional(),
  posterUrl: z.string().max(512).nullable().optional(),
  duration: z.string().max(32).optional(),
  status: z.enum(["published", "coming_soon"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const contentRouter = createRouter({
  /** 公开：站点全部内容 */
  all: publicQuery.query(() => getAllContent()),

  /* ---------- 节点管理 ---------- */
  createNode: adminQuery.input(nodeInput).mutation(async ({ input }) => {
    await getDb().insert(nodes).values(input);
    return getAllContent();
  }),
  updateNode: adminQuery
    .input(z.object({ id: z.number(), data: nodeInput.partial() }))
    .mutation(async ({ input }) => {
      await getDb().update(nodes).set(input.data).where(eq(nodes.id, input.id));
      return getAllContent();
    }),
  deleteNode: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(nodes).where(eq(nodes.id, input.id));
      return getAllContent();
    }),

  /* ---------- 诗人管理 ---------- */
  createPoet: adminQuery.input(poetInput).mutation(async ({ input }) => {
    const { route, ...rest } = input;
    await getDb()
      .insert(poets)
      .values({ ...rest, route: route ? JSON.stringify(route) : null });
    return getAllContent();
  }),
  updatePoet: adminQuery
    .input(z.object({ id: z.number(), data: poetInput.partial() }))
    .mutation(async ({ input }) => {
      const { route, ...rest } = input.data;
      await getDb()
        .update(poets)
        .set({ ...rest, ...(route ? { route: JSON.stringify(route) } : {}) })
        .where(eq(poets.id, input.id));
      return getAllContent();
    }),
  deletePoet: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(poems).where(eq(poems.poetId, input.id));
      await db.delete(poets).where(eq(poets.id, input.id));
      return getAllContent();
    }),

  /* ---------- 诗作管理 ---------- */
  createPoem: adminQuery.input(poemInput).mutation(async ({ input }) => {
    await getDb().insert(poems).values(input);
    return getAllContent();
  }),
  updatePoem: adminQuery
    .input(z.object({ id: z.number(), data: poemInput.partial() }))
    .mutation(async ({ input }) => {
      await getDb().update(poems).set(input.data).where(eq(poems.id, input.id));
      return getAllContent();
    }),
  deletePoem: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(poems).where(eq(poems.id, input.id));
      return getAllContent();
    }),

  /* ---------- 视频管理 ---------- */
  createVideo: adminQuery.input(videoInput).mutation(async ({ input }) => {
    await getDb().insert(videos).values(input);
    return getAllContent();
  }),
  updateVideo: adminQuery
    .input(z.object({ id: z.number(), data: videoInput.partial() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(videos)
        .set(input.data)
        .where(eq(videos.id, input.id));
      return getAllContent();
    }),
  deleteVideo: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(videos).where(eq(videos.id, input.id));
      return getAllContent();
    }),
});
