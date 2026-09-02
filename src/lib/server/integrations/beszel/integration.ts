import "server-only";
import type { Job } from "../types";
import { secrets } from "@/lib/server/secrets";
import { beszelGet } from "./client";
import type {
  BeszelSystemRecord, BeszelAlertRecord, BeszelSnapshot, BeszelSystemSummary,
} from "./types";

async function buildSnapshot(signal: AbortSignal): Promise<BeszelSnapshot> {
  const sys = await beszelGet<{ items: BeszelSystemRecord[] }>(
    "/api/collections/systems/records?perPage=200&skipTotal=1&sort=name&fields=id,name,host,port,status,info,updated",
    signal,
  );
  let alertItems: BeszelAlertRecord[] = [];
  try {
    const alerts = await beszelGet<{ items: BeszelAlertRecord[] }>(
      "/api/collections/alerts/records?perPage=200&skipTotal=1&filter=(triggered%3Dtrue)&fields=id,system,name,value",
      signal,
    );
    alertItems = alerts.items ?? [];
  } catch {
    /* alerts optional */
  }
  const systems: BeszelSystemSummary[] = (sys.items ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    hostname: s.info?.h ?? s.host,
    status: s.status,
    cpuPct: Math.round((s.info?.cpu ?? 0) * 10) / 10,
    memPct: Math.round((s.info?.mp ?? 0) * 10) / 10,
    diskPct: Math.round((s.info?.dp ?? 0) * 10) / 10,
    tempC: s.info?.dt ?? null,
    bandwidthMbps: s.info?.b ?? null,
    uptimeSec: s.info?.u ?? 0,
    agentVersion: s.info?.v ?? "",
    lastSeenAt: s.updated,
  }));
  return {
    hubUrl: secrets.beszel.url ?? "",
    systems,
    alerts: alertItems.map((a) => ({ id: a.id, systemId: a.system, name: a.name, value: a.value })),
    summary: {
      total: systems.length,
      up: systems.filter((s) => s.status === "up").length,
      down: systems.filter((s) => s.status === "down").length,
    },
  };
}

export function beszelJobs(): Job[] {
  return [
    {
      integration: "beszel",
      key: "overview",
      intervalMs: 30_000,
      timeoutMs: 8000,
      configured: () => secrets.beszel.configured,
      run: (signal) => buildSnapshot(signal),
    },
  ];
}
