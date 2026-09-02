import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VERSION = process.env.npm_package_version ?? "0.1.0";

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2000)),
    ]);
    checks.db = "ok";
  } catch {
    checks.db = "down";
    ok = false;
  }
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", version: VERSION, checks },
    { status: ok ? 200 : 503 },
  );
}
