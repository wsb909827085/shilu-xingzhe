import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";

const fullSchema = { ...schema };

/* 连接池：保持长连接，断线自动重连，避免单次请求失败拖垮服务 */
let pool: mysql.Pool | null = null;
let instance: ReturnType<typeof drizzle<typeof fullSchema>> | null = null;

/* 优雅降级：DATABASE_URL 缺失/连接失败时只告警一次，
   相关 tRPC 查询抛错由前端静态兜底接管，服务器本身继续 serving */
let warnedMissing = false;

export function getDb() {
  if (!env.databaseUrl) {
    /* DATABASE_URL 未配置：仅 log 警告并向查询层抛错（tRPC 返回错误），
       绝不让进程崩溃——/healthz 与前端静态资源必须保持可用。
       避免 createPool 落到默认 localhost 而挂起到 connectTimeout，
       在平台网关侧表现为 502。平台部署时必须在环境变量中配置 DATABASE_URL。 */
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        "[db] DATABASE_URL 未配置：数据库查询将返回错误，前端使用静态兜底数据。",
      );
    }
    throw new Error(
      "[db] DATABASE_URL 未配置。请在部署平台的环境变量中设置 DATABASE_URL（TiDB/MySQL 连接串）。",
    );
  }
  if (!instance) {
    pool = mysql.createPool({
      uri: env.databaseUrl,
      waitForConnections: true,
      connectionLimit: 5,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      connectTimeout: 10000,
    });
    pool.on("error", (err) => {
      console.warn("[db] 连接池错误（将自动重连）:", err.message);
    });
    try {
      instance = drizzle(pool, {
        mode: "planetscale",
        schema: fullSchema,
      });
    } catch (err) {
      /* 初始化失败不拖垮进程：重置状态，下次查询重试 */
      pool = null;
      instance = null;
      console.warn("[db] 初始化失败（下次查询将重试）:", (err as Error).message);
      throw err;
    }
  }
  return instance;
}

/** 非阻塞启动探活：仅 log，结果不影响服务器启动 */
export async function probeDb() {
  if (!env.databaseUrl) return;
  try {
    getDb(); // 确保连接池已创建
    const conn = await pool!.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }
    console.log("[db] 数据库连接正常");
  } catch (err) {
    console.warn(
      "[db] 数据库连接失败（服务继续运行，前端使用静态兜底）:",
      (err as Error).message,
    );
  }
}
