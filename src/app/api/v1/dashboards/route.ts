import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { roleAtLeast } from "@/lib/auth/roles";
import { listDashboards } from "@/lib/dashboards/queries";
import { membershipFor } from "@/lib/dashboards/access";
import { createDashboard } from "@/lib/dashboards/mutations";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ser(d: Awaited<ReturnType<typeof listDashboards>>[number]) {
  return {
    id: d.id, slug: d.slug, name: d.name, isPublic: d.isPublic, isDefault: d.isDefault,
    theme: d.theme, accent: d.accent, addressType: d.addressType, kiosk: d.kiosk,
  };
}

export const GET = withApi({ auth: "required" }, async ({ actor }) => {
  const all = await listDashboards();
  if (roleAtLeast(actor!.role, "admin")) return json({ items: all.map(ser) });
  const visible = [];
  for (const d of all) {
    if (d.isPublic || d.ownerId === actor!.user.id) { visible.push(d); continue; }
    if (await membershipFor(actor, d.id)) visible.push(d);
  }
  return json({ items: visible.map(ser) });
});

export const POST = withApi({ role: "admin" }, async ({ req, actor }) => {
  const b = await readJson<{ name: string }>(req);
  if (!b?.name) throw err.badRequest("name required");
  const d = await createDashboard({ name: b.name, ownerId: actor!.user.id });
  await audit(actor, "create_dashboard", d.slug);
  return json(ser(d), { status: 201, headers: { location: `/api/v1/dashboards/${d.slug}` } });
});
