import { withApi, json } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { readSnapshot } from "@/lib/server/integrations/snapshots";

const MAP: Record<string, { integration: string; key: string; intervalMs: number }> = {
  beszel: { integration: "beszel", key: "overview", intervalMs: 30_000 },
  uptime: { integration: "uptime_kuma", key: "overview", intervalMs: 60_000 },
  openrouter: { integration: "openrouter", key: "overview", intervalMs: 900_000 },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ auth: "required" }, async ({ params }) => {
  const m = MAP[params.source];
  if (!m) throw err.notFound();
  const snap = await readSnapshot(m.integration, m.key, m.intervalMs);
  if (!snap) return json({ source: params.source, status: "unconfigured", payload: null });
  return json({ source: params.source, ...snap });
});
