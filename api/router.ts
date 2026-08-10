import { authRouter } from "./auth-router";
import { accountRouter } from "./accountRouter";
import { kbRouter } from "./kbRouter";
import { feedbackRouter } from "./feedbackRouter";
import { aiRouter } from "./aiRouter";
import { contentRouter } from "./contentRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  account: accountRouter,
  kb: kbRouter,
  feedback: feedbackRouter,
  ai: aiRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;
