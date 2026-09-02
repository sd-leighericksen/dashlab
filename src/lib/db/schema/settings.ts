import {
  pgTable,
  smallint,
  text,
  integer,
  jsonb,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { themeMode, addressType, openMode } from "./enums";

export const settings = pgTable(
  "settings",
  {
    id: smallint().primaryKey().default(1),
    homelabName: text().notNull().default("Nimbus Cloud"),
    bannerText: text(),
    bannerFont: text().notNull().default("ANSI Shadow"),
    themeDefault: themeMode().notNull().default("dark"),
    accentDefault: text().notNull().default("#f3b445"),
    addressDefault: addressType().notNull().default("domain"),
    openInDefault: openMode().notNull().default("new_tab"),
    probeIntervalS: integer().notNull().default(60),
    probeTimeoutMs: integer().notNull().default(5000),
    probeConcurrency: integer().notNull().default(6),
    probeRetentionDays: integer().notNull().default(7),
    bigScreenScale: text().notNull().default("1"),
    timezone: text().notNull().default("Australia/Melbourne"),
    setupCompletedAt: timestamp({ withTimezone: true, mode: "date" }),
    extra: jsonb().notNull().default({}),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);

export type Settings = typeof settings.$inferSelect;
