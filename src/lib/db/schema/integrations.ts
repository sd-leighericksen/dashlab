import {
  pgTable,
  text,
  boolean,
  jsonb,
  timestamp,
  date,
  numeric,
  bigint,
  integer,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const integrations = pgTable("integrations", {
  id: text().primaryKey(), // beszel | uptime_kuma | openrouter
  enabled: boolean().notNull().default(false),
  config: jsonb().notNull().default({}),
  secretsEnc: bytea(), // reserved: AES-256-GCM under HKDF(DASHLAB_SECRET)
  lastOkAt: timestamp({ withTimezone: true, mode: "date" }),
  lastError: text(),
  updatedAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const integrationSnapshots = pgTable(
  "integration_snapshots",
  {
    integration: text().notNull(),
    key: text().notNull(),
    payload: jsonb(),
    ok: boolean().notNull().default(false),
    errorCode: text(),
    error: text(),
    fetchedAt: timestamp({ withTimezone: true, mode: "date" }),
    attemptedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    durationMs: integer(),
  },
  (t) => [primaryKey({ columns: [t.integration, t.key] })],
);

export const openrouterActivityDaily = pgTable(
  "openrouter_activity_daily",
  {
    date: date().notNull(),
    model: text().notNull(),
    endpointId: text().notNull().default(""),
    apiKeyHash: text().notNull().default(""),
    providerName: text(),
    usageUsd: numeric({ precision: 14, scale: 6 }).notNull().default("0"),
    byokUsd: numeric({ precision: 14, scale: 6 }).notNull().default("0"),
    requests: integer().notNull().default(0),
    promptTokens: bigint({ mode: "number" }).notNull().default(0),
    completionTokens: bigint({ mode: "number" }).notNull().default(0),
    reasoningTokens: bigint({ mode: "number" }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.date, t.model, t.endpointId, t.apiKeyHash] })],
);

export type IntegrationSnapshot = typeof integrationSnapshots.$inferSelect;
