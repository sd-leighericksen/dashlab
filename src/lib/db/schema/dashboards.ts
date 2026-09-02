import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { themeMode, addressType, openMode, layoutMode, contentKind } from "./enums";

export const dashboards = pgTable(
  "dashboards",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull(), // 8-char random, unambiguous alphabet
    name: text().notNull(),
    ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
    isPublic: boolean().notNull().default(false),
    isDefault: boolean().notNull().default(false),
    kiosk: boolean().notNull().default(false),
    layout: layoutMode().notNull().default("list"),
    refreshSeconds: integer().notNull().default(60),
    scale: text().notNull().default("1"),
    publicShowsPrivateAddresses: boolean().notNull().default(false),
    // overrides (null = fall back to settings default)
    theme: themeMode(),
    accent: text(),
    bannerText: text(),
    bannerFont: text(),
    addressType: addressType(),
    openIn: openMode(),
    // visibility toggles
    showDetailPages: boolean().notNull().default(true),
    showWidgets: boolean().notNull().default(true),
    showExternal: boolean().notNull().default(true),
    showServers: boolean().notNull().default(true),
    showStatus: boolean().notNull().default(true),
    showPorts: boolean().notNull().default(true),
    showServer: boolean().notNull().default(true),
    showUptime: boolean().notNull().default(true),
    showFilters: boolean().notNull().default(true),
    columns: smallint(),
    createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dashboards_slug_uk").on(t.slug),
    uniqueIndex("dashboards_default_uk").on(t.isDefault).where(sql`${t.isDefault}`),
    index("dashboards_owner_idx").on(t.ownerId),
  ],
);

export const dashboardUsers = pgTable(
  "dashboard_users",
  {
    dashboardId: uuid()
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canEdit: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.dashboardId, t.userId] })],
);

export const dashboardCategories = pgTable(
  "dashboard_categories",
  {
    dashboardId: uuid()
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    categorySlug: text().notNull(),
    sortOrder: integer().notNull().default(0),
    includeAll: boolean().notNull().default(true),
    collapsed: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.dashboardId, t.categorySlug] })],
);

export const dashboardItems = pgTable(
  "dashboard_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    dashboardId: uuid()
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    kind: contentKind().notNull(),
    slug: text().notNull(),
    categorySlug: text(),
    sortOrder: integer().notNull().default(0),
    pinned: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dashboard_items_uk").on(t.dashboardId, t.kind, t.slug),
    index("dashboard_items_order_idx").on(t.dashboardId, t.categorySlug, t.sortOrder),
  ],
);

export const dashboardWidgets = pgTable(
  "dashboard_widgets",
  {
    id: uuid().primaryKey().defaultRandom(),
    dashboardId: uuid()
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text(),
    config: jsonb().notNull().default({}),
    size: text().notNull().default("md"),
    sortOrder: integer().notNull().default(0),
    enabled: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("dashboard_widgets_order_idx").on(t.dashboardId, t.sortOrder)],
);

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type DashboardItem = typeof dashboardItems.$inferSelect;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
