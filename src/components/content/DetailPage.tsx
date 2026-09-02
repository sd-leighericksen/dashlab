import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { probeState } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { getContent, listContent, servicesForServer } from "@/lib/content/repo";
import type { ContentKindT } from "@/lib/content/kinds";
import type { AddressType } from "@/lib/content/types";
import { getActor } from "@/lib/auth/actor";
import { roleAtLeast } from "@/lib/auth/roles";
import { ManPage } from "./ManPage";

export async function DetailPage({
  slug,
  kind,
  itemSlug,
}: {
  slug: string;
  kind: ContentKindT;
  itemSlug: string;
}) {
  const dash = await getDashboardBySlug(slug);
  if (!dash) notFound();
  if (!dash.showDetailPages) notFound();

  const row = await getContent(kind, itemSlug);
  if (!row) notFound();

  const settings = await getSettings();
  const actor = await getActor();
  const editHref = actor && roleAtLeast(actor.role, "admin") ? `/settings/content/${kind}/${itemSlug}/edit` : null;
  const probe =
    (await db.query.probeState.findFirst({
      where: and(eq(probeState.kind, kind), eq(probeState.slug, itemSlug)),
    })) ?? null;

  let related: { kind: ContentKindT; slug: string; name: string }[] = [];
  if (kind === "server") {
    related = (await servicesForServer(itemSlug)).map((r) => ({
      kind: r.kind,
      slug: r.slug,
      name: r.name,
    }));
  } else if (row.categorySlug) {
    related = (await listContent(kind, { category: row.categorySlug }))
      .filter((r) => r.slug !== itemSlug)
      .slice(0, 8)
      .map((r) => ({ kind: r.kind, slug: r.slug, name: r.name }));
  }

  return (
    <ManPage
      kind={kind}
      row={row}
      probe={probe}
      preferred={(dash.addressType ?? settings.addressDefault) as AddressType}
      homelabName={settings.homelabName}
      detailBase={`/d/${dash.slug}`}
      related={related}
      backHref={`/d/${dash.slug}`}
      editHref={editHref}
    />
  );
}
