"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword, dummyVerify } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie, requestMeta } from "@/lib/auth/cookies";
import { rateLimit } from "@/lib/auth/rate-limit";

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));
  const meta = await requestMeta();

  const ipRl = rateLimit(`login:ip:${meta.ip ?? "local"}`, 10, 15 * 60_000);
  const userRl = rateLimit(`login:user:${username}`, 5, 15 * 60_000);
  const fail = (msg = "Invalid credentials") =>
    redirect(`/login?error=${encodeURIComponent(msg)}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
  if (!ipRl.ok || !userRl.ok) fail("Too many attempts, wait a few minutes");

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || user.disabledAt) {
    await dummyVerify();
    fail();
    return;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) fail();

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const { token, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(token, expiresAt);
  redirect(user.mustChangePassword ? "/account?change=1" : next);
}
