import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type DrizzleDb = NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __dashlabPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dashlabDb: DrizzleDb | undefined;
}

// Lazy so `next build` (no DATABASE_URL) never constructs a pool at import time.
export function getPool(): Pool {
  if (!globalThis.__dashlabPool) {
    globalThis.__dashlabPool = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__dashlabPool;
}

export function getDb(): DrizzleDb {
  if (!globalThis.__dashlabDb) {
    globalThis.__dashlabDb = drizzle(getPool(), { schema, casing: "snake_case" });
  }
  return globalThis.__dashlabDb;
}

// Proxy so existing `import { db }` call sites keep working, but the pool is
// only created on first actual query.
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const val = real[prop];
    return typeof val === "function" ? val.bind(real) : val;
  },
});

export type DB = DrizzleDb;
export { schema };
