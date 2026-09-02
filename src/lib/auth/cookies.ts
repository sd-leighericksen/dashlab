import "server-only";
import { cookies } from "next/headers";
import { getEnv, cookieSecure } from "@/lib/env";
import { sessionCookieName } from "./session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const secure = cookieSecure(getEnv());
  const jar = await cookies();
  jar.set(sessionCookieName(secure), token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const secure = cookieSecure(getEnv());
  const jar = await cookies();
  jar.delete(sessionCookieName(secure));
}

export async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const trustProxy = getEnv().TRUST_PROXY;
  const ip = trustProxy
    ? h.get("x-forwarded-for")?.split(",")[0]?.trim()
    : undefined;
  return { ip, userAgent: h.get("user-agent") ?? undefined };
}
