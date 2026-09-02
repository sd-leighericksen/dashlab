import "server-only";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiKeys, users, type ApiKey, type User } from "@/lib/db/schema";
import { newApiKey } from "@/lib/crypto/random";
import { sha256hex } from "@/lib/crypto/secrets";
import { scopesForRole, type Scope } from "./roles";

export type VerifiedKey = {
  user: User;
  apiKey: ApiKey;
  scopes: Scope[];
};

const lastUsedThrottle = new Map<string, number>();

export async function verifyApiKey(token: string): Promise<VerifiedKey | null> {
  if (!token.startsWith("dl_")) return null;
  const keyHash = sha256hex(token);
  const row = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, keyHash),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
    ),
  });
  if (!row) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, row.userId),
  });
  if (!user || user.disabledAt) return null;

  // Throttle last-used writes to once/60s per key.
  const now = Date.now();
  const prev = lastUsedThrottle.get(row.id) ?? 0;
  if (now - prev > 60_000) {
    lastUsedThrottle.set(row.id, now);
    void db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id))
      .catch(() => {});
  }
  return { user, apiKey: row, scopes: scopesForRole(user.role) };
}

export async function issueApiKey(
  userId: string,
  name: string,
  expiresAt?: Date,
): Promise<{ id: string; key: string; prefix: string }> {
  const key = newApiKey();
  const prefix = key.slice(3, 11); // 8 chars after dl_
  const [row] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash: sha256hex(key), keyPrefix: prefix, expiresAt })
    .returning({ id: apiKeys.id });
  return { id: row.id, key, prefix };
}

export async function revokeApiKey(id: string): Promise<void> {
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function listApiKeys(userId?: string): Promise<ApiKey[]> {
  const { asc } = await import("drizzle-orm");
  if (userId) {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(asc(apiKeys.createdAt));
  }
  return db.select().from(apiKeys).orderBy(asc(apiKeys.createdAt));
}

export async function getApiKeyOwner(id: string): Promise<string | null> {
  const row = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, id) });
  return row?.userId ?? null;
}
