import "server-only";
import { and, eq, lte, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contentIndex, probeState } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { runProbe, recomputeUptime, pruneResults } from "./prober";

type SchedState = {
  tick: NodeJS.Timeout | null;
  uptime: NodeJS.Timeout | null;
  prune: NodeJS.Timeout | null;
  running: Set<string>;
};
const g = globalThis as { __dashlabProbe?: SchedState };
g.__dashlabProbe ??= { tick: null, uptime: null, prune: null, running: new Set() };

async function tick(): Promise<void> {
  const s = g.__dashlabProbe!;
  const settings = await getSettings();
  const defaults = { intervalS: settings.probeIntervalS, timeoutMs: settings.probeTimeoutMs };
  const concurrency = settings.probeConcurrency;

  // items that are due (no state row, or nextDueAt in the past)
  const due = await db
    .select({
      kind: contentIndex.kind,
      slug: contentIndex.slug,
      frontmatter: contentIndex.frontmatter,
    })
    .from(contentIndex)
    .leftJoin(
      probeState,
      and(eq(probeState.kind, contentIndex.kind), eq(probeState.slug, contentIndex.slug)),
    )
    .where(
      and(
        eq(contentIndex.valid, true),
        or(isNull(probeState.nextDueAt), lte(probeState.nextDueAt, new Date())),
      ),
    );

  const batch = due
    .filter((d) => !s.running.has(`${d.kind}:${d.slug}`))
    .slice(0, concurrency * 3);

  let active = 0;
  let i = 0;
  await new Promise<void>((resolve) => {
    const pump = () => {
      while (active < concurrency && i < batch.length) {
        const item = batch[i++];
        const key = `${item.kind}:${item.slug}`;
        s.running.add(key);
        active++;
        runProbe(item.kind, item.slug, item.frontmatter as Record<string, unknown>, defaults)
          .catch((err) => logger.debug({ err, key }, "probe error"))
          .finally(() => {
            s.running.delete(key);
            active--;
            if (i >= batch.length && active === 0) resolve();
            else pump();
          });
      }
      if (batch.length === 0) resolve();
    };
    pump();
  });
}

export function startProbeScheduler(): void {
  const s = g.__dashlabProbe!;
  if (s.tick) return;
  s.tick = setInterval(() => void tick().catch(() => {}), 5000);
  s.uptime = setInterval(() => void recomputeUptime().catch(() => {}), 60_000);
  s.prune = setInterval(
    async () => {
      const settings = await getSettings();
      await pruneResults(settings.probeRetentionDays).catch(() => {});
    },
    3600_000,
  );
  for (const t of [s.tick, s.uptime, s.prune]) if (t?.unref) t.unref();
  // kick an immediate pass shortly after boot
  setTimeout(() => void tick().catch(() => {}), 1500);
  logger.info("probe scheduler started");
}

export function stopProbeScheduler(): void {
  const s = g.__dashlabProbe!;
  for (const t of [s.tick, s.uptime, s.prune]) if (t) clearInterval(t);
  s.tick = s.uptime = s.prune = null;
}
