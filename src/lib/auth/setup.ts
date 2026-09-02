import "server-only";
import { count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { setupCode as genCode } from "@/lib/crypto/random";

type SetupState = { code: string | null };
const g = globalThis as { __dashlabSetup?: SetupState };
g.__dashlabSetup ??= { code: null };

export async function userCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(users);
  return row?.n ?? 0;
}

export async function isSetupComplete(): Promise<boolean> {
  return (await userCount()) > 0;
}

/** One-time setup code, generated on first request and held in memory. */
export function getOrCreateSetupCode(): string {
  if (!g.__dashlabSetup!.code) g.__dashlabSetup!.code = genCode();
  return g.__dashlabSetup!.code;
}

export function verifySetupCode(input: string): boolean {
  const code = g.__dashlabSetup!.code;
  if (!code) return false;
  return input.trim().toUpperCase() === code;
}

export function clearSetupCode(): void {
  g.__dashlabSetup!.code = null;
}
