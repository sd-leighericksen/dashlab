import "server-only";

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export type RateResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter: number;
};

/** Fixed-window limiter (in-memory, single instance). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateResult {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, limit, resetAt, retryAfter: 0 };
  }
  b.count += 1;
  const ok = b.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - b.count),
    limit,
    resetAt: b.resetAt,
    retryAfter: ok ? 0 : Math.ceil((b.resetAt - now) / 1000),
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

// Periodic prune so the map cannot grow unbounded.
if (!(globalThis as { __dashlabRlSweep?: boolean }).__dashlabRlSweep) {
  (globalThis as { __dashlabRlSweep?: boolean }).__dashlabRlSweep = true;
  const t = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  }, 60_000);
  if (typeof t.unref === "function") t.unref();
}
