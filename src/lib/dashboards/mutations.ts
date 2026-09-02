import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dashboards,
  dashboardCategories,
  dashboardItems,
  dashboardWidgets,
  dashboardUsers,
  type Dashboard,
} from "@/lib/db/schema";
import { dashboardSlug } from "@/lib/crypto/random";
import type { ContentKindT } from "@/lib/content/kinds";

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const s = dashboardSlug();
    const exists = await db.query.dashboards.findFirst({ where: eq(dashboards.slug, s) });
    if (!exists) return s;
  }
  return dashboardSlug(10);
}

export async function createDashboard(input: {
  name: string;
  ownerId: string;
}): Promise<Dashboard> {
  const slug = await uniqueSlug();
  const [row] = await db
    .insert(dashboards)
    .values({ name: input.name, slug, ownerId: input.ownerId })
    .returning();
  return row;
}

type DashPatch = Partial<
  Pick<
    Dashboard,
    | "name" | "theme" | "accent" | "bannerText" | "bannerFont" | "addressType" | "openIn"
    | "isPublic" | "kiosk" | "refreshSeconds" | "scale" | "publicShowsPrivateAddresses"
    | "showDetailPages" | "showWidgets" | "showExternal" | "showServers" | "showStatus"
    | "showPorts" | "showServer" | "showUptime" | "showFilters" | "columns" | "layout"
  >
>;

export async function updateDashboard(id: string, patch: DashPatch): Promise<void> {
  await db.update(dashboards).set({ ...patch, updatedAt: new Date() }).where(eq(dashboards.id, id));
}

export async function regenerateSlug(id: string): Promise<string> {
  const slug = await uniqueSlug();
  await db.update(dashboards).set({ slug, updatedAt: new Date() }).where(eq(dashboards.id, id));
  return slug;
}

export async function setDefaultDashboard(id: string): Promise<void> {
  await db.update(dashboards).set({ isDefault: false }).where(sql`true`);
  await db.update(dashboards).set({ isDefault: true }).where(eq(dashboards.id, id));
}

export async function deleteDashboard(id: string): Promise<void> {
  await db.delete(dashboards).where(eq(dashboards.id, id));
}

export async function setDashboardCategories(
  id: string,
  cats: { slug: string; includeAll: boolean }[],
): Promise<void> {
  await db.delete(dashboardCategories).where(eq(dashboardCategories.dashboardId, id));
  if (cats.length) {
    await db.insert(dashboardCategories).values(
      cats.map((c, i) => ({
        dashboardId: id,
        categorySlug: c.slug,
        sortOrder: i * 10,
        includeAll: c.includeAll,
      })),
    );
  }
}

export async function setDashboardItems(
  id: string,
  items: { kind: ContentKindT; slug: string; categorySlug?: string }[],
): Promise<void> {
  await db.delete(dashboardItems).where(eq(dashboardItems.dashboardId, id));
  if (items.length) {
    await db.insert(dashboardItems).values(
      items.map((it, i) => ({
        dashboardId: id,
        kind: it.kind,
        slug: it.slug,
        categorySlug: it.categorySlug ?? null,
        sortOrder: i * 10,
      })),
    );
  }
}

export async function setDashboardWidgets(id: string, types: string[]): Promise<void> {
  await db.delete(dashboardWidgets).where(eq(dashboardWidgets.dashboardId, id));
  if (types.length) {
    await db.insert(dashboardWidgets).values(
      types.map((t, i) => ({ dashboardId: id, type: t, sortOrder: i * 10 })),
    );
  }
}

export async function setDashboardUsers(
  id: string,
  users: { userId: string; canEdit: boolean }[],
): Promise<void> {
  await db.delete(dashboardUsers).where(eq(dashboardUsers.dashboardId, id));
  if (users.length) {
    await db.insert(dashboardUsers).values(
      users.map((u) => ({ dashboardId: id, userId: u.userId, canEdit: u.canEdit })),
    );
  }
}

export async function getDashboardConfig(id: string) {
  const dash = await db.query.dashboards.findFirst({ where: eq(dashboards.id, id) });
  if (!dash) return null;
  const cats = await db
    .select()
    .from(dashboardCategories)
    .where(eq(dashboardCategories.dashboardId, id));
  const widgets = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboardId, id));
  const members = await db
    .select()
    .from(dashboardUsers)
    .where(eq(dashboardUsers.dashboardId, id));
  const items = await db
    .select()
    .from(dashboardItems)
    .where(eq(dashboardItems.dashboardId, id));
  return { dash, cats, widgets, members, items };
}

export async function addDashboardItem(
  dashboardId: string,
  kind: ContentKindT,
  slug: string,
  categorySlug?: string,
): Promise<void> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${dashboardItems.sortOrder}),0)` })
    .from(dashboardItems)
    .where(eq(dashboardItems.dashboardId, dashboardId));
  await db
    .insert(dashboardItems)
    .values({ dashboardId, kind, slug, categorySlug: categorySlug ?? null, sortOrder: Number(max) + 10 })
    .onConflictDoNothing();
}

export async function removeDashboardItem(
  dashboardId: string,
  kind: ContentKindT,
  slug: string,
): Promise<void> {
  await db
    .delete(dashboardItems)
    .where(
      and(
        eq(dashboardItems.dashboardId, dashboardId),
        eq(dashboardItems.kind, kind),
        eq(dashboardItems.slug, slug),
      ),
    );
}
