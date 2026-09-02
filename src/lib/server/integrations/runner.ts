import "server-only";
import type { Job } from "./types";
import { IntegrationError } from "./types";
import { writeSnapshotOk, writeSnapshotError } from "./snapshots";
import { logger } from "@/lib/logger";

type JobState = { nextDueAt: number; failures: number; running: boolean };
type RunnerState = { tick: NodeJS.Timeout | null; jobs: Job[]; state: Map<string, JobState> };
const g = globalThis as { __dashlabIntRunner?: RunnerState };
g.__dashlabIntRunner ??= { tick: null, jobs: [], state: new Map() };

function jobKey(j: Job): string {
  return `${j.integration}:${j.key}`;
}

async function runJob(job: Job, st: JobState): Promise<void> {
  const key = jobKey(job);
  if (!job.configured()) {
    await writeSnapshotError(job.integration, job.key, "unconfigured", "not configured");
    st.nextDueAt = Date.now() + 5 * 60_000; // re-check config every 5m
    return;
  }
  const started = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), job.timeoutMs);
  if (typeof timer.unref === "function") timer.unref();
  try {
    const payload = await job.run(ac.signal);
    await writeSnapshotOk(job.integration, job.key, payload, Date.now() - started);
    st.failures = 0;
    st.nextDueAt = Date.now() + job.intervalMs;
  } catch (e) {
    st.failures += 1;
    const code = e instanceof IntegrationError ? e.code : "upstream_error";
    const retryAfter = e instanceof IntegrationError ? e.retryAfterMs : undefined;
    await writeSnapshotError(job.integration, job.key, code, (e as Error).message.slice(0, 200));
    const backoff = Math.min(2 ** st.failures, 8);
    st.nextDueAt = Date.now() + (retryAfter ?? job.intervalMs * backoff);
    logger.debug({ key, err: (e as Error).message }, "integration job failed");
  } finally {
    clearTimeout(timer);
  }
}

async function tick(): Promise<void> {
  const r = g.__dashlabIntRunner!;
  const now = Date.now();
  for (const job of r.jobs) {
    const key = jobKey(job);
    let st = r.state.get(key);
    if (!st) {
      st = { nextDueAt: now, failures: 0, running: false };
      r.state.set(key, st);
    }
    if (st.running || st.nextDueAt > now) continue;
    st.running = true;
    void runJob(job, st).finally(() => {
      st.running = false;
    });
  }
}

export async function startIntegrationRunner(): Promise<void> {
  const r = g.__dashlabIntRunner!;
  if (r.tick) return;
  const { getJobs } = await import("./registry");
  r.jobs = getJobs();
  r.tick = setInterval(() => void tick().catch(() => {}), 5000);
  if (typeof r.tick.unref === "function") r.tick.unref();
  setTimeout(() => void tick().catch(() => {}), 2000);
  logger.info({ jobs: r.jobs.length }, "integration runner started");
}

export function stopIntegrationRunner(): void {
  const r = g.__dashlabIntRunner!;
  if (r.tick) clearInterval(r.tick);
  r.tick = null;
}

/** Force an integration's jobs to run on the next tick (after a config change). */
export function refreshIntegration(integration: string): void {
  const r = g.__dashlabIntRunner!;
  const now = Date.now();
  for (const job of r.jobs) {
    if (job.integration !== integration) continue;
    const st = r.state.get(`${job.integration}:${job.key}`);
    if (st) st.nextDueAt = now;
  }
}
