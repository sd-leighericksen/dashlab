import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { probeResults, probeState } from "@/lib/db/schema";
import type { ContentKindT } from "@/lib/content/kinds";
import { bus } from "@/lib/events/bus";
import { resolveProbe } from "./config";
import { probeHttp, type ProbeOutcome } from "./http";
import { probeTcp } from "./tcp";

const FLIP_THRESHOLD = 2;

export async function runProbe(
  kind: ContentKindT,
  slug: string,
  fm: Record<string, unknown>,
  defaults: { intervalS: number; timeoutMs: number },
): Promise<void> {
  const target = resolveProbe(kind, fm, defaults);
  const now = new Date();

  if (!target) {
    await db
      .insert(probeState)
      .values({
        kind,
        slug,
        enabled: false,
        state: "disabled",
        lastCheckedAt: now,
        nextDueAt: new Date(now.getTime() + 3600_000),
      })
      .onConflictDoUpdate({
        target: [probeState.kind, probeState.slug],
        set: { enabled: false, state: "disabled", lastCheckedAt: now, nextDueAt: new Date(now.getTime() + 3600_000) },
      });
    return;
  }

  const outcome: ProbeOutcome =
    target.mode === "http" ? await probeHttp(target) : await probeTcp(target);

  await db.insert(probeResults).values({
    kind,
    slug,
    checkedAt: now,
    ok: outcome.ok,
    status: outcome.status ?? null,
    latencyMs: outcome.latencyMs,
    error: outcome.error ?? null,
  });

  const prev = await db.query.probeState.findFirst({
    where: and(eq(probeState.kind, kind), eq(probeState.slug, slug)),
  });
  const consecutiveFailures = outcome.ok ? 0 : (prev?.consecutiveFailures ?? 0) + 1;

  // flap dampening: flip to down only after N consecutive failures
  let state: "up" | "down" | "unknown" = prev?.state === "disabled" ? "unknown" : (prev?.state as "up" | "down" | "unknown") ?? "unknown";
  if (outcome.ok) state = "up";
  else if (consecutiveFailures >= FLIP_THRESHOLD) state = "down";
  else if (!prev || prev.state === "unknown" || prev.state === "disabled") state = "unknown";

  const stateChanged = prev?.state !== state;
  const interval = target.intervalS;
  // backoff for repeatedly-down hosts
  const backoff = !outcome.ok && consecutiveFailures > 3 ? Math.min(2 ** (consecutiveFailures - 3), 10) : 1;
  const jitter = 0.9 + Math.random() * 0.2;
  const nextDueAt = new Date(now.getTime() + interval * 1000 * backoff * jitter);

  await db
    .insert(probeState)
    .values({
      kind,
      slug,
      enabled: true,
      state,
      stateSince: now,
      lastCheckedAt: now,
      lastOk: outcome.ok,
      lastStatus: outcome.status ?? null,
      lastLatencyMs: outcome.latencyMs,
      lastError: outcome.error ?? null,
      consecutiveFailures,
      nextDueAt,
      targetUrl: target.mode === "http" ? target.url : `${target.host}:${target.port}`,
      kindLabel: outcome.kind,
    })
    .onConflictDoUpdate({
      target: [probeState.kind, probeState.slug],
      set: {
        enabled: true,
        state,
        ...(stateChanged ? { stateSince: now } : {}),
        lastCheckedAt: now,
        lastOk: outcome.ok,
        lastStatus: outcome.status ?? null,
        lastLatencyMs: outcome.latencyMs,
        lastError: outcome.error ?? null,
        consecutiveFailures,
        nextDueAt,
        targetUrl: target.mode === "http" ? target.url : `${target.host}:${target.port}`,
        kindLabel: outcome.kind,
      },
    });

  bus.emitEvent("probe:update", { kind, slug });
}

/** Recompute 24h / 7d uptime for all items from probe_results. */
export async function recomputeUptime(): Promise<void> {
  await db.execute(sql`
    UPDATE probe_state ps SET
      uptime_24h = sub.u24,
      uptime_7d = sub.u7
    FROM (
      SELECT kind, slug,
        round(100.0 * count(*) FILTER (WHERE ok AND checked_at > now() - interval '24 hours')
              / NULLIF(count(*) FILTER (WHERE checked_at > now() - interval '24 hours'), 0), 2) AS u24,
        round(100.0 * count(*) FILTER (WHERE ok AND checked_at > now() - interval '7 days')
              / NULLIF(count(*) FILTER (WHERE checked_at > now() - interval '7 days'), 0), 2) AS u7
      FROM probe_results GROUP BY kind, slug
    ) sub
    WHERE ps.kind = sub.kind AND ps.slug = sub.slug
  `);
}

export async function pruneResults(retentionDays: number): Promise<void> {
  await db.execute(
    sql`DELETE FROM probe_results WHERE checked_at < now() - (${retentionDays} || ' days')::interval`,
  );
}
