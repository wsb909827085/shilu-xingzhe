import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

/* 平台健康检查：不依赖数据库，进程存活即 200，避免网关误判 502 */
app.get("/healthz", (c) => c.json({ ok: true, ts: Date.now() }));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  const t0 = Date.now();
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
  const ms = Date.now() - t0;
  if (ms > 1500) {
    console.warn(`[trpc] 慢请求 ${c.req.path} ${ms}ms`);
  }
  return res;
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// 反馈图片等上传文件（项目根 uploads/ 目录）
app.use("/uploads/*", async (c, next) => {
  const { serveStatic } = await import("@hono/node-server/serve-static");
  return serveStatic({ root: "./", rewriteRequestPath: (p) => p })(c, next);
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    console.log(`Server running on http://0.0.0.0:${info.port}/`);
  });

  /* 数据库非阻塞探活：失败仅告警，绝不影响 serving（优雅降级） */
  const { probeDb } = await import("./queries/connection");
  probeDb().catch((err) =>
    console.warn("[db] 探活异常（已忽略）:", (err as Error).message),
  );
}
