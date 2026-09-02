import { withApi, json } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { getDashboardBySlug, getFullDashboard } from "@/lib/dashboards/queries";
import { canViewDashboard } from "@/lib/dashboards/access";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ auth: "optional" }, async ({ actor, params }) => {
  const dash = await getDashboardBySlug(params.slug);
  if (!dash) throw err.notFound();
  if (!(await canViewDashboard(actor, dash))) throw actor ? err.notFound() : err.unauthorized();
  const full = await getFullDashboard(dash);
  const probes = full.sections.flatMap((s) =>
    s.items.map((it) => ({
      kind: it.content.kind,
      slug: it.content.slug,
      state: it.probe?.state ?? "unknown",
      uptime24h: it.probe?.uptime24h ?? null,
      latencyMs: it.probe?.lastLatencyMs ?? null,
    })),
  );
  return json({
    updatedAt: new Date().toISOString(),
    counts: full.counts,
    probes,
    widgets: {},
  });
});
