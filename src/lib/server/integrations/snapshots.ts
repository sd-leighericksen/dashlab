import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationSnapshots } from "@/lib/db/schema";
import type { SnapshotStatus } from "./types";

export type SnapshotView = {
  integration: string;
  key: string;
  status: SnapshotStatus;
  payload: unknown;
  fetchedAt: string | null;
  attemptedAt: string | null;
  error: string | null;
  intervalMs?: number;
};

export async function writeSnapshotOk(
  integration: string,
  key: string,
  payload: unknown,
  durationMs: number,
): Promise<void> {
  const now = new Date();
  await db
    .insert(integrationSnapshots)
    .values({ integration, key, payload, ok: true, error: null, errorCode: null, fetchedAt: now, attemptedAt: now, durationMs })
    .onConflictDoUpdate({
      target: [integrationSnapshots.integration, integrationSnapshots.key],
      set: { payload, ok: true, error: null, errorCode: null, fetchedAt: now, attemptedAt: now, durationMs },
    });
}

export async function writeSnapshotError(
  integration: string,
  key: string,
  code: SnapshotStatus,
  error: string,
): Promise<void> {
  const now = new Date();
  await db
    .insert(integrationSnapshots)
    .values({ integration, key, ok: false, errorCode: code, error, attemptedAt: now })
    .onConflictDoUpdate({
      target: [integrationSnapshots.integration, integrationSnapshots.key],
      set: { ok: false, errorCode: code, error, attemptedAt: now },
    });
}

export async function readSnapshot(
  integration: string,
  key: string,
  intervalMs?: number,
): Promise<SnapshotView | null> {
  const row = await db.query.integrationSnapshots.findFirst({
    where: and(eq(integrationSnapshots.integration, integration), eq(integrationSnapshots.key, key)),
  });
  if (!row) return null;
  let status: SnapshotStatus;
  if (row.ok) {
    const staleMs = intervalMs ? intervalMs * 3 : 0;
    status =
      staleMs && row.fetchedAt && Date.now() - row.fetchedAt.getTime() > staleMs ? "stale" : "ok";
  } else {
    status = (row.errorCode as SnapshotStatus) ?? "upstream_error";
  }
  return {
    integration,
    key,
    status,
    payload: row.payload,
    fetchedAt: row.fetchedAt?.toISOString() ?? null,
    attemptedAt: row.attemptedAt?.toISOString() ?? null,
    error: row.error,
    intervalMs,
  };
}
