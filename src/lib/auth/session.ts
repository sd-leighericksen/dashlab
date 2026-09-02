import "server-only";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, type Session } from "@/lib/db/schema";
import { randomToken } from "@/lib/crypto/random";
import { sha256hex } from "@/lib/crypto/secrets";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_SECURE = "__Host-dashlab_session";
export const SESSION_COOKIE_INSECURE = "dashlab_session";

export function sessionCookieName(secure: boolean): string {
  return secure ? SESSION_COOKIE_SECURE : SESSION_COOKIE_INSECURE;
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const id = sha256hex(token);
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { token, expiresAt };
}

export type ResolvedSession = { session: Session; renewedTo?: Date };

export async function resolveSession(
  token: string,
): Promise<ResolvedSession | null> {
  const id = sha256hex(token);
  const row = await db.query.sessions.findFirst({ where: eq(sessions.id, id) });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  let renewedTo: Date | undefined;
  const remaining = row.expiresAt.getTime() - Date.now();
  const now = new Date();
  const updates: Partial<Session> = {};
  if (remaining < RENEW_THRESHOLD_MS) {
    renewedTo = new Date(Date.now() + THIRTY_DAYS_MS);
    updates.expiresAt = renewedTo;
  }
  // throttle lastSeen writes to ~5 min
  if (now.getTime() - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    updates.lastSeenAt = now;
  }
  if (Object.keys(updates).length) {
    await db.update(sessions).set(updates).where(eq(sessions.id, id));
  }
  return { session: { ...row, ...updates }, renewedTo };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sha256hex(token)));
}

export async function destroyUserSessions(
  userId: string,
  exceptToken?: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  void exceptToken; // full wipe on password change; caller re-issues if needed
}

export async function sweepExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
