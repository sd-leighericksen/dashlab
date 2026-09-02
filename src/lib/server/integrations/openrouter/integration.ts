import "server-only";
import { fetch } from "undici";
import type { Job } from "../types";
import { IntegrationError } from "../types";
import { secrets } from "@/lib/server/secrets";

const BASE = "https://openrouter.ai/api/v1";

type ActivityRow = {
  date: string; model: string; usage: number; requests: number;
  prompt_tokens: number; completion_tokens: number; reasoning_tokens?: number;
};
type KeyRow = { hash: string; name: string; label?: string; disabled?: boolean; usage?: number; usage_daily?: number; limit?: number | null; limit_remaining?: number | null };

export type OpenRouterSnapshot = {
  credits: { total: number; used: number; remaining: number } | null;
  todayApproxUsd: number;
  daily: { date: string; usd: number }[];
  byModel: { model: string; usd: number; promptTokens: number; completionTokens: number }[];
  keys: { name: string; usd: number; usdDaily: number; limit: number | null; limitRemaining: number | null }[];
};

async function orGet<T>(path: string, key: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${key}` }, signal });
  if (res.status === 401) throw new IntegrationError("auth_failed", "openrouter: invalid key");
  if (res.status === 403) throw new IntegrationError("auth_failed", "openrouter: management key required");
  if (res.status === 429) throw new IntegrationError("upstream_error", "openrouter: rate limited", 60_000);
  if (!res.ok) throw new IntegrationError("upstream_error", `openrouter ${res.status}`);
  return (await res.json()) as T;
}

async function buildSnapshot(signal: AbortSignal): Promise<OpenRouterSnapshot> {
  const key = secrets.openrouter.managementKey;
  if (!key) throw new IntegrationError("unconfigured", "openrouter not configured");

  const credits = await orGet<{ data: { total_credits: number; total_usage: number } }>("/credits", key, signal);
  const activity = await orGet<{ data: ActivityRow[] }>("/activity", key, signal).catch(() => ({ data: [] as ActivityRow[] }));
  const keysResp = await orGet<{ data: KeyRow[] }>("/keys?include_disabled=true", key, signal).catch(() => ({ data: [] as KeyRow[] }));

  const dailyMap = new Map<string, number>();
  const modelMap = new Map<string, { usd: number; p: number; c: number }>();
  for (const r of activity.data ?? []) {
    dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.usage);
    const m = modelMap.get(r.model) ?? { usd: 0, p: 0, c: 0 };
    m.usd += r.usage; m.p += r.prompt_tokens; m.c += r.completion_tokens;
    modelMap.set(r.model, m);
  }
  const keys = (keysResp.data ?? []).map((k) => ({
    name: k.name ?? k.label ?? k.hash.slice(0, 8),
    usd: k.usage ?? 0,
    usdDaily: k.usage_daily ?? 0,
    limit: k.limit ?? null,
    limitRemaining: k.limit_remaining ?? null,
  }));

  return {
    credits: {
      total: credits.data.total_credits,
      used: credits.data.total_usage,
      remaining: credits.data.total_credits - credits.data.total_usage,
    },
    todayApproxUsd: keys.reduce((s, k) => s + k.usdDaily, 0),
    daily: [...dailyMap.entries()].map(([date, usd]) => ({ date, usd })).sort((a, b) => a.date.localeCompare(b.date)),
    byModel: [...modelMap.entries()]
      .map(([model, v]) => ({ model, usd: v.usd, promptTokens: v.p, completionTokens: v.c }))
      .sort((a, b) => b.usd - a.usd),
    keys,
  };
}

export function openrouterJobs(): Job[] {
  return [
    {
      integration: "openrouter",
      key: "overview",
      intervalMs: 15 * 60_000,
      timeoutMs: 10_000,
      configured: () => secrets.openrouter.configured,
      run: (signal) => buildSnapshot(signal),
    },
  ];
}
