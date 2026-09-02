import { withApi, json } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { canEditDashboard } from "@/lib/dashboards/access";
import { regenerateSlug } from "@/lib/dashboards/mutations";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi({ auth: "required" }, async ({ actor, params }) => {
  const dash = await getDashboardBySlug(params.slug);
  if (!dash) throw err.notFound();
  if (!(await canEditDashboard(actor, dash))) throw err.forbidden();
  const slug = await regenerateSlug(dash.id);
  await audit(actor, "regenerate_slug", slug, { from: params.slug });
  return json({ slug });
});
