import "server-only";
import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { getEnv } from "@/lib/env";
import { contentRoot } from "./paths";
import { isIgnored, reindexPath, removePath, scanAll } from "./indexer";
import { logger } from "@/lib/logger";

type WatchState = { watcher: FSWatcher | null; rescan: NodeJS.Timeout | null };
const g = globalThis as { __dashlabWatch?: WatchState };
g.__dashlabWatch ??= { watcher: null, rescan: null };

const debounces = new Map<string, NodeJS.Timeout>();

function toRel(abs: string): string {
  return path.relative(contentRoot(), abs).split(path.sep).join("/");
}

function schedule(abs: string, fn: (rel: string) => void, delay = 350): void {
  const rel = toRel(abs);
  const prev = debounces.get(rel);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    debounces.delete(rel);
    fn(rel);
  }, delay);
  if (typeof t.unref === "function") t.unref();
  debounces.set(rel, t);
}

export function startWatcher(): void {
  if (g.__dashlabWatch!.watcher) return;
  const env = getEnv();
  const root = contentRoot();
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    depth: 1,
    atomic: 250,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    usePolling: env.CONTENT_WATCH_POLL,
    interval: 2000,
    ignored: (p, stats) => {
      if (!stats) return false;
      if (stats.isDirectory()) return false;
      return isIgnored(path.basename(p));
    },
  });
  watcher
    .on("add", (p) => schedule(p, (rel) => void reindexPath(rel)))
    .on("change", (p) => schedule(p, (rel) => void reindexPath(rel)))
    .on("unlink", (p) => schedule(p, (rel) => void removePath(rel)))
    .on("error", (err) => logger.warn({ err }, "watcher error"));
  g.__dashlabWatch!.watcher = watcher;

  const interval = env.CONTENT_RESCAN_INTERVAL_S * 1000;
  const rescan = setInterval(() => void scanAll().catch(() => {}), interval);
  if (typeof rescan.unref === "function") rescan.unref();
  g.__dashlabWatch!.rescan = rescan;
  logger.info({ root, poll: env.CONTENT_WATCH_POLL }, "content watcher started");
}

export function stopWatcher(): void {
  g.__dashlabWatch!.watcher?.close();
  g.__dashlabWatch!.watcher = null;
  if (g.__dashlabWatch!.rescan) clearInterval(g.__dashlabWatch!.rescan);
}
