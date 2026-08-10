import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  double,
  boolean,
  primaryKey,
} from "drizzle-orm/mysql-core";

/* ---------- 用户与角色 ---------- */

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "editor", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** 邮箱密码账号（与 users 表一对一；unionId 形如 email:xxx） */
export const accounts = mysqlTable("accounts", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

/* ---------- 知识库内容表 ---------- */

/** 地理节点（行迹所经州县/关隘） */
export const nodes = mysqlTable("nodes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  lon: double("lon").notNull(),
  lat: double("lat").notNull(),
  highlight: boolean("highlight").default(false).notNull(),
  note: text("note"),
  /** 引用出处 */
  source: varchar("source", { length: 512 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MapNode = typeof nodes.$inferSelect;
export type InsertMapNode = typeof nodes.$inferInsert;

/** 贬谪诗人 */
export const poets = mysqlTable("poets", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  dynasty: varchar("dynasty", { length: 32 }).notNull(),
  years: varchar("years", { length: 64 }),
  era: varchar("era", { length: 255 }),
  color: varchar("color", { length: 16 }).notNull().default("#d4a24e"),
  summary: text("summary"),
  /** JSON 数组：行迹节点 slug，按时间顺序 */
  route: text("route"),
  startYear: int("startYear"),
  image: varchar("image", { length: 255 }),
  /** 引用出处 */
  source: varchar("source", { length: 512 }),
  /** 200-500字过岭经历详述 */
  detail: text("detail"),
  /** 生平年表 JSON [{year, event}] */
  chronicle: text("chronicle"),
  /** AI 画像路径（可后台上传替换） */
  aiPortrait: varchar("aiPortrait", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Poet = typeof poets.$inferSelect;
export type InsertPoet = typeof poets.$inferInsert;

/** 过岭诗作 */
export const poems = mysqlTable("poems", {
  id: serial("id").primaryKey(),
  poetId: bigint("poetId", { mode: "number", unsigned: true }).notNull(),
  nodeSlug: varchar("nodeSlug", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  lines: text("lines").notNull(),
  note: text("note"),
  year: int("year"),
  /** 创作背景（年份、地点、事件） */
  background: text("background"),
  /** 引用出处（如《全唐诗》卷五十一） */
  source: varchar("source", { length: 512 }),
  /** 古诗文网诗作直达链接 */
  extUrl: varchar("extUrl", { length: 255 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Poem = typeof poems.$inferSelect;
export type InsertPoem = typeof poems.$inferInsert;

/** 诗人图片/视频素材（录入员上传 → 管理员审核后展示） */
export const media = mysqlTable("media", {
  id: serial("id").primaryKey(),
  poetId: bigint("poetId", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["image", "video"]).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  note: text("note"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  uploaderId: bigint("uploaderId", { mode: "number", unsigned: true }),
  reviewerId: bigint("reviewerId", { mode: "number", unsigned: true }),
  reviewNote: varchar("reviewNote", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

/* ---------- 用户反馈 ---------- */

export const feedbacks = mysqlTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  category: mysqlEnum("category", ["correction", "suggestion", "data", "other"])
    .default("suggestion")
    .notNull(),
  /** 关联模块（选择题）：map / poet / poem / node / event / ai / other */
  module: varchar("module", { length: 32 }).default("other").notNull(),
  /** 关联对象标识（诗人 slug / 节点 slug / 诗作 id 等，可空） */
  target: varchar("target", { length: 128 }),
  content: text("content").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  /** JSON 数组：图片路径 */
  images: text("images"),
  status: mysqlEnum("status", ["unread", "read", "resolved"])
    .default("unread")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;

/* ---------- AI 助手 ---------- */

/** 用户托管的模型 API Key（AES-GCM 加密存储） */
export const aiKeys = mysqlTable("aiKeys", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  provider: mysqlEnum("provider", ["kimi", "deepseek", "openai", "custom"]).notNull(),
  /** AES-GCM 加密后的 key，格式 iv.cipher（base64） */
  encryptedKey: text("encryptedKey").notNull(),
  keyMask: varchar("keyMask", { length: 32 }),
  baseUrl: varchar("baseUrl", { length: 255 }),
  model: varchar("model", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AiKey = typeof aiKeys.$inferSelect;
export type InsertAiKey = typeof aiKeys.$inferInsert;

/* ---------- 主站门户内容 ---------- */

/** 「南迁几个回」AI 短视频 */
export const videos = mysqlTable("videos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  poetName: varchar("poetName", { length: 64 }),
  description: text("description"),
  videoUrl: varchar("videoUrl", { length: 512 }),
  posterUrl: varchar("posterUrl", { length: 512 }),
  duration: varchar("duration", { length: 32 }),
  status: mysqlEnum("status", ["published", "coming_soon"])
    .default("coming_soon")
    .notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/** 诗人导览站解说（知识库可维护；AI 补齐接口也会写入） */
export const tourStops = mysqlTable(
  "tourStops",
  {
    poetSlug: varchar("poetSlug", { length: 64 }).notNull(),
    nodeSlug: varchar("nodeSlug", { length: 64 }).notNull(),
    seq: int("seq").notNull(),
    text: text("text").notNull(),
  },
  (t) => [primaryKey({ columns: [t.poetSlug, t.nodeSlug, t.seq] })],
);

export type TourStop = typeof tourStops.$inferSelect;
