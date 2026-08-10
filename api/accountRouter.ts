import * as crypto from "crypto";
import * as cookie from "cookie";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { accounts, users } from "@db/schema";

function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash: `${s}:${hash}` };
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

async function createSession(ctx: { req: Request; resHeaders: Headers }, unionId: string) {
  const token = await signSessionToken({ unionId, clientId: env.appId });
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

async function findUserByEmail(email: string) {
  const db = getDb();
  const acc = (await db.select().from(accounts).where(eq(accounts.email, email)).limit(1)).at(0);
  if (!acc) return null;
  const user = (await db.select().from(users).where(eq(users.id, acc.userId)).limit(1)).at(0);
  return user ? { account: acc, user } : null;
}

export const accountRouter = createRouter({
  /** 邮箱 + 密码注册 */
  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "密码至少 8 位"),
        name: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      if (await findUserByEmail(email)) {
        throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册" });
      }
      const db = getDb();
      const unionId = `email:${email}`;
      await db.insert(users).values({
        unionId,
        name: input.name,
        email,
        lastSignInAt: new Date(),
      });
      const user = (await db.select().from(users).where(eq(users.unionId, unionId)).limit(1)).at(0)!;
      await db.insert(accounts).values({
        userId: user.id,
        email,
        passwordHash: hashPassword(input.password).hash,
      });
      await createSession(ctx, unionId);
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),

  /** 邮箱 + 密码登录 */
  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const found = await findUserByEmail(email);
      if (!found || !verifyPassword(input.password, found.account.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
      }
      await getDb()
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, found.user.id));
      await createSession(ctx, found.user.unionId);
      return {
        id: found.user.id,
        name: found.user.name,
        email: found.user.email,
        role: found.user.role,
      };
    }),

  /** 管理员创建账号并指定角色 */
  createAccount: adminQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(64),
        role: z.enum(["user", "editor", "admin"]),
      }),
    )
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      if (await findUserByEmail(email)) {
        throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册" });
      }
      const db = getDb();
      const unionId = `email:${email}`;
      await db.insert(users).values({
        unionId,
        name: input.name,
        email,
        role: input.role,
        lastSignInAt: new Date(),
      });
      const user = (await db.select().from(users).where(eq(users.unionId, unionId)).limit(1)).at(0)!;
      await db.insert(accounts).values({
        userId: user.id,
        email,
        passwordHash: hashPassword(input.password).hash,
      });
      return { ok: true };
    }),

  /** 管理员：账号列表 */
  listAccounts: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(users).orderBy(asc(users.createdAt));
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      unionId: u.unionId,
      role: u.role,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    }));
  }),

  /** 管理员：调整角色 */
  setRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "editor", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能移除自己的管理员角色" });
      }
      await getDb().update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { ok: true };
    }),

  /** 管理员：删除账号 */
  deleteAccount: adminQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能删除自己的账号" });
      }
      const db = getDb();
      await db.delete(accounts).where(eq(accounts.userId, input.userId));
      await db.delete(users).where(eq(users.id, input.userId));
      return { ok: true };
    }),

  /** 修改自己的密码 */
  changePassword: authedQuery
    .input(z.object({ oldPassword: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const acc = (
        await db.select().from(accounts).where(eq(accounts.userId, ctx.user.id)).limit(1)
      ).at(0);
      if (!acc) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该账号未设置密码（Kimi 登录）" });
      }
      if (!verifyPassword(input.oldPassword, acc.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "原密码错误" });
      }
      await db
        .update(accounts)
        .set({ passwordHash: hashPassword(input.newPassword).hash })
        .where(eq(accounts.id, acc.id));
      return { ok: true };
    }),
});
