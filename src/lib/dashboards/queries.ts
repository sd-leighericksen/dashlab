import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dashboards,
  dashboardCategories,
  dashboardItems,
  dashboardWidgets,
  categories,
  contentIndex,
  probeState,
  type Dashboard,
  type ContentRow,
  type ProbeState,
  type DashboardWidget,
} from "@/lib/db/schema";
import type { ContentKindT } from "@/lib/content/kinds";

export async function getDashboardBySlug(slug: string): Promise<Dashboard | null> {
  const row = await db.query.dashboards.findFirst({ where: eq(dashboards.slug, slug) });
  return row ?? null;
}

export async function getDefaultDashboard(): Promise<Dashboard | null> {
  const row = await db.query.dashboards.findFirst({ where: eq(dashboards.isDefault, true) });
  return row ?? null;
}

export async function listDashboards(): Promise<Dashboard[]> {
  return db.select().from(dashboards).orderBy(asc(dashboards.name));
}

export type DashItem = { content: ContentRow; probe: ProbeState | null };
export type DashSection = { slug: string; name: string; glyph: string | null; items: DashItem[] };
export type FullDashboard = {
  dashboard: Dashboard;
  sections: DashSection[];
  widgets: DashboardWidget[];
  counts: { total: number; up: number; down: number; unknown: number };
};

export async function getFullDashboard(dash: Dashboard): Promise<FullDashboard> {
  const dcats = await db
    .select()
    .from(dashboardCategories)
    .where(eq(dashboardCategories.dashboardId, dash.id))
    .orderBy(asc(dashboardCategories.sortOrder));

  const catMeta = await db.select().from(categories);
  const glyphBySlug = new Map(catMeta.map((c) => [c.slug, c.glyph]));
  const nameBySlug = new Map(catMeta.map((c) => [c.slug, c.name]));

  // curated items (for categories with includeAll=false)
  const curated = await db
    .select()
    .from(dashboardItems)
    .where(eq(dashboardItems.dashboardId, dash.id));
  const curatedByCat = new Map<string, { kind: ContentKindT; slug: string }[]>();
  for (const it of curated) {
    const arr = curatedByCat.get(it.categorySlug ?? "") ?? [];
    arr.push({ kind: it.kind, slug: it.slug });
    curatedByCat.set(it.categorySlug ?? "", arr);
  }

  // all valid, non-hidden content
  const allContent = await db
    .select()
    .from(contentIndex)
    .where(eq(contentIndex.valid, true));
  const visible = allContent.filter((c) => {
    if ((c.frontmatter as { hidden?: boolean })?.hidden) return false;
    if (c.kind === "external" && !dash.showExternal) return false;
    if (c.kind === "server" && !dash.showServers) return false;
    return true;
  });
  const byCategory = new Map<string, ContentRow[]>();
  for (const c of visible) {
    const key = c.categorySlug ?? "uncategorised";
    const arr = byCategory.get(key) ?? [];
    arr.push(c);
    byCategory.set(key, arr);
  }

  // probe state map
  const stateRows = await db.select().from(probeState);
  const stateKey = (k: string, s: string) => `${k}:${s}`;
  const stateMap = new Map(stateRows.map((r) => [stateKey(r.kind, r.slug), r]));

  const sections: DashSection[] = [];
  const counts = { total: 0, up: 0, down: 0, unknown: 0 };

  const pushItem = (arr: DashItem[], c: ContentRow) => {
    const probe = stateMap.get(stateKey(c.kind, c.slug)) ?? null;
    arr.push({ content: c, probe });
    counts.total++;
    if (probe?.state === "up") counts.up++;
    else if (probe?.state === "down") counts.down++;
    else counts.unknown++;
  };

  for (const dc of dcats) {
    const items: DashItem[] = [];
    if (dc.includeAll) {
      for (const c of (byCategory.get(dc.categorySlug) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
        pushItem(items, c);
      }
    } else {
      const picks = curatedByCat.get(dc.categorySlug) ?? [];
      for (const p of picks) {
        const c = visible.find((v) => v.kind === p.kind && v.slug === p.slug);
        if (c) pushItem(items, c);
      }
    }
    if (items.length) {
      sections.push({
        slug: dc.categorySlug,
        name: nameBySlug.get(dc.categorySlug) ?? dc.categorySlug,
        glyph: glyphBySlug.get(dc.categorySlug) ?? `/${dc.categorySlug}`,
        items,
      });
    }
  }

  const widgets = dash.showWidgets
    ? await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboardId, dash.id))
        .orderBy(asc(dashboardWidgets.sortOrder))
    : [];

  return { dashboard: dash, sections, widgets: widgets.filter((w) => w.enabled), counts };
}

export function resolveTheme(dash: Dashboard, fallback: "light" | "dark"): "light" | "dark" {
  if (dash.theme === "light" || dash.theme === "dark") return dash.theme;
  return fallback;
}

export { inArray };
