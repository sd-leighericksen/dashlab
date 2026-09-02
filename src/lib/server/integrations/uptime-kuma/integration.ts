import "server-only";
import { fetch } from "undici";
import type { Job } from "../types";
import { IntegrationError } from "../types";
import { secrets } from "@/lib/server/secrets";

type KumaMonitor = { id: number; name: string; sendUrl?: boolean | number; type: string; url?: string };
type KumaStatusPage = {
  config: { title: string; slug: string };
  publicGroupList: { id: number; name: string; monitorList: KumaMonitor[] }[];
};
type KumaBeat = { status: 0 | 1 | 2 | 3; time: string; ping: number | null };
type KumaHeartbeat = {
  heartbeatList: Record<string, KumaBeat[]>;
  uptimeList: Record<string, number>;
};

const STATE = ["down", "up", "pending", "maintenance"] as const;

export type UptimeMonitor = {
  id: number; name: string; group: string; type: string; url: string | null;
  status: (typeof STATE)[number] | "unknown";
  uptime24h: number | null; lastPingMs: number | null;
  beats: { s: number; t: string; p: number | null }[];
};
export type UptimeSnapshot = {
  url: string; title: string;
  monitors: UptimeMonitor[];
  summary: { total: number; up: number; down: number; pending: number; maintenance: number };
};

async function jget<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (res.status === 404) throw new IntegrationError("upstream_error", "uptime-kuma: status page not found");
  if (!res.ok) throw new IntegrationError("unreachable", `uptime-kuma ${res.status}`);
  return (await res.json()) as T;
}

async function buildSnapshot(signal: AbortSignal): Promise<UptimeSnapshot> {
  const { url, statusSlug } = secrets.uptimeKuma;
  if (!url || !statusSlug) throw new IntegrationError("unconfigured", "uptime-kuma not configured");
  const [page, hb] = await Promise.all([
    jget<KumaStatusPage>(`${url}/api/status-page/${statusSlug}`, signal),
    jget<KumaHeartbeat>(`${url}/api/status-page/heartbeat/${statusSlug}`, signal),
  ]);
  const monitors: UptimeMonitor[] = [];
  for (const group of page.publicGroupList ?? []) {
    for (const m of group.monitorList ?? []) {
      const beats = hb.heartbeatList?.[String(m.id)] ?? [];
      const last = beats[beats.length - 1];
      monitors.push({
        id: m.id,
        name: m.name,
        group: group.name,
        type: m.type,
        url: m.url ?? null,
        status: last ? STATE[last.status] ?? "unknown" : "unknown",
        uptime24h: hb.uptimeList?.[`${m.id}_24`] ?? null,
        lastPingMs: last?.ping ?? null,
        beats: beats.slice(-50).map((b) => ({ s: b.status, t: b.time, p: b.ping })),
      });
    }
  }
  return {
    url,
    title: page.config?.title ?? "status",
    monitors,
    summary: {
      total: monitors.length,
      up: monitors.filter((m) => m.status === "up").length,
      down: monitors.filter((m) => m.status === "down").length,
      pending: monitors.filter((m) => m.status === "pending").length,
      maintenance: monitors.filter((m) => m.status === "maintenance").length,
    },
  };
}

export function uptimeKumaJobs(): Job[] {
  return [
    {
      integration: "uptime_kuma",
      key: "overview",
      intervalMs: 60_000,
      timeoutMs: 8000,
      configured: () => secrets.uptimeKuma.configured,
      run: (signal) => buildSnapshot(signal),
    },
  ];
}
