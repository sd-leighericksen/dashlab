import "server-only";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { db, getPool } from "./client";
import { logger } from "@/lib/logger";

const ADVISORY_LOCK_KEY = 4820_1971; // arbitrary constant unique to dashlab migrations

/** Run pending migrations under a Postgres advisory lock (safe across replicas/dev). */
export async function runMigrations(): Promise<void> {
  const folder = path.join(process.cwd(), "drizzle");
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    logger.info("running migrations");
    await migrate(db, { migrationsFolder: folder });
    logger.info("migrations complete");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

/** Retry the initial connection so we survive Postgres booting alongside us. */
export async function waitForDb(retries = 10): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.execute(sql`select 1`);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = Math.min(1000 * attempt, 5000);
      logger.warn({ attempt, delay }, "db not ready, retrying");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
