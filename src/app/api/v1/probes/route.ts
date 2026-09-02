import { withApi, json } from "@/lib/api/http";
import { db } from "@/lib/db/client";
import { probeState } from "@/lib/db/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ auth: "required" }, async () => {
  const rows = await db.select().from(probeState);
  return json({
    items: rows.map((r) => ({
      type: r.kind,
      slug: r.slug,
      state: r.state,
      uptime24h: r.uptime24h,
      uptime7d: r.uptime7d,
      latencyMs: r.lastLatencyMs,
      lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
      error: r.lastError,
    })),
  });
});
