import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/* 显式定位项目根的 .env：dist/boot.js 位于 <root>/dist/boot.js，
   项目根 = boot.js 的上上级。这样无论进程工作目录在哪（平台部署
   常非项目根），都能正确加载 .env，避免「DATABASE_URL 未配置」。 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(__dirname, "../../.env"), // 源码 api/lib/ → 项目根
  path.resolve(__dirname, "../.env"), // dist/ → 项目根
  path.resolve(process.cwd(), ".env"), // 进程工作目录（兜底）
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    /* 不因缺失环境变量直接崩溃（否则平台健康检查失败 → 502），
       降级为空值并打日志，相关功能（登录/AI）不可用时由业务层提示 */
    console.warn(`[env] Missing environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
