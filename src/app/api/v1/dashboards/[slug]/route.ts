import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { getDashboardConfig, updateDashboard } from "@/lib/dashboards/mutations";
import { canViewDashboard, canEditDashboard } from "@/lib/dashboards/access";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOOL = ["isPublic","kiosk","publicShowsPrivateAddresses","showDetailPages","showWidgets","showExternal","showServers","showStatus","showPorts","showServer","showUptime","showFilters"] as const;
const STR = ["name","theme","accent","bannerText","bannerFont","addressType","openIn","scale"] as const;

export const GET = withApi({ auth: "optional" }, async ({ actor, params }) => {
  const dash = await getDashboardBySlug(params.slug);
  if (!dash) throw err.notFound();
  if (!(await canViewDashboard(actor, dash))) throw actor ? err.notFound() : err.unauthorized();
  const cfg = await getDashboardConfig(dash.id);
  return json({
    id: dash.id, slug: dash.slug, name: dash.name, isPublic: dash.isPublic, isDefault: dash.isDefault,
    theme: dash.theme, accent: dash.accent, bannerText: dash.bannerText, bannerFont: dash.bannerFont,
    addressType: dash.addressType, kiosk: dash.kiosk, refreshSeconds: dash.refreshSeconds,
    categories: cfg?.cats.map((c) => ({ slug: c.categorySlug, includeAll: c.includeAll })) ?? [],
    widgets: cfg?.widgets.map((w) => w.type) ?? [],
  });
});

export const PATCH = withApi({ auth: "required" }, async ({ req, actor, params }) => {
  const dash = await getDashboardBySlug(params.slug);
  if (!dash) throw err.notFound();
  if (!(await canEditDashboard(actor, dash))) throw err.forbidden();
  const b = await readJson<Record<string, unknown>>(req);
  const patch: Record<string, unknown> = {};
  for (const k of STR) if (k in b) patch[k] = b[k] === "" ? null : b[k];
  for (const k of BOOL) if (k in b) patch[k] = !!b[k];
  if ("refreshSeconds" in b) patch.refreshSeconds = Number(b.refreshSeconds);
  await updateDashboard(dash.id, patch);
  await audit(actor, "update_dashboard", dash.slug);
  return json({ ok: true });
});
