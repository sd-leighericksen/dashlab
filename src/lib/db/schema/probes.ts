import {
  pgTable,
  bigserial,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { contentKind, probeStatus } from "./enums";

export const probeState = pgTable(
  "probe_state",
  {
    kind: contentKind().notNull(),
    slug: text().notNull(),
    enabled: boolean().notNull().default(true),
    state: probeStatus().notNull().default("unknown"),
    stateSince: timestamp({ withTimezone: true, mode: "date" }),
    lastCheckedAt: timestamp({ withTimezone: true, mode: "date" }),
    lastOk: boolean(),
    lastStatus: integer(),
    lastLatencyMs: integer(),
    lastError: text(),
    consecutiveFailures: integer().notNull().default(0),
    uptime24h: numeric({ precision: 5, scale: 2 }),
    uptime7d: numeric({ precision: 5, scale: 2 }),
    nextDueAt: timestamp({ withTimezone: true, mode: "date" }),
    targetUrl: text(),
    kindLabel: text(), // "http" | "tcp"
  },
  (t) => [primaryKey({ columns: [t.kind, t.slug] })],
);

export const probeResults = pgTable(
  "probe_results",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    kind: contentKind().notNull(),
    slug: text().notNull(),
    checkedAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
    ok: boolean().notNull(),
    status: integer(),
    latencyMs: integer(),
    error: text(),
  },
  (t) => [index("probe_results_recent_idx").on(t.kind, t.slug, t.checkedAt.desc())],
);

export const probeHourly = pgTable(
  "probe_hourly",
  {
    kind: contentKind().notNull(),
    slug: text().notNull(),
    hour: timestamp({ withTimezone: true, mode: "date" }).notNull(),
    checks: integer().notNull().default(0),
    okCount: integer().notNull().default(0),
    avgLatencyMs: integer(),
    maxLatencyMs: integer(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.slug, t.hour] })],
);

export type ProbeState = typeof probeState.$inferSelect;
export type ProbeResult = typeof probeResults.$inferSelect;
