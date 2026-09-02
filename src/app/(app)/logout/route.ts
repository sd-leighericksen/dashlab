import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEnv, cookieSecure } from "@/lib/env";
import { sessionCookieName, destroySession } from "@/lib/auth/session";
import { clearSessionCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function doLogout(req: Request): Promise<NextResponse> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName(cookieSecure(getEnv())))?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const POST = doLogout;
export const GET = doLogout;
