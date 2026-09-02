import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { canEditDashboard } from "@/lib/dashboards/access";
import { setDashboardItems } from "@/lib/dashboards/mutations";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = withApi({ auth: "required" }, async ({ req, actor, params }) => {
  const dash = await getDashboardBySlug(params.slug);
  if (!dash) throw err.notFound();
  if (!(await canEditDashboard(actor, dash))) throw err.forbidden();
  const items = await readJson<{ kind: string; slug: string; categorySlug?: string }[]>(req);
  if (!Array.isArray(items)) throw err.badRequest("expected an array");
  for (const it of items)
    if (!(CONTENT_KINDS as readonly string[]).includes(it.kind)) throw err.badRequest(`invalid kind ${it.kind}`);
  await setDashboardItems(
    dash.id,
    items.map((it) => ({ kind: it.kind as ContentKindT, slug: it.slug, categorySlug: it.categorySlug })),
  );
  return json({ ok: true, count: items.length });
});
