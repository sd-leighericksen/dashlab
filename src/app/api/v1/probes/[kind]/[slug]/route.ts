import { withApi, json } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { probeFor } from "@/lib/content/service";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ auth: "required" }, async ({ params }) => {
  if (!(CONTENT_KINDS as readonly string[]).includes(params.kind)) throw err.badRequest("invalid kind");
  const p = await probeFor(params.kind as ContentKindT, params.slug);
  if (!p) throw err.notFound();
  return json({
    type: p.kind,
    slug: p.slug,
    state: p.state,
    uptime24h: p.uptime24h,
    uptime7d: p.uptime7d,
    latencyMs: p.lastLatencyMs,
    lastCheckedAt: p.lastCheckedAt?.toISOString() ?? null,
    error: p.lastError,
  });
});
