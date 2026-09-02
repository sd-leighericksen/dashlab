import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { waitForDb, runMigrations } from "@/lib/db/migrate";
import {
  ensureSettings,
  seedDefaultCategories,
  maybeSeedSuperuserFromEnv,
} from "@/lib/db/seed";
import { userCount, getOrCreateSetupCode } from "@/lib/auth/setup";
import { logger } from "@/lib/logger";

type BootState = { promise: Promise<void> | null; done: boolean };
const g = globalThis as { __dashlabBoot?: BootState };
g.__dashlabBoot ??= { promise: null, done: false };

export function boot(): Promise<void> {
  if (g.__dashlabBoot!.promise) return g.__dashlabBoot!.promise;
  g.__dashlabBoot!.promise = doBoot().catch((err) => {
    logger.error({ err }, "boot failed");
    g.__dashlabBoot!.promise = null; // allow retry on next request
    throw err;
  });
  return g.__dashlabBoot!.promise;
}

async function doBoot(): Promise<void> {
  logger.info("dashlab booting");
  await waitForDb();
  await runMigrations();
  await ensureSettings();
  await seedDefaultCategories();

  try {
    const { loadDbSecrets } = await import("@/lib/server/secrets");
    await loadDbSecrets();
  } catch (err) {
    logger.debug({ err }, "loadDbSecrets skipped");
  }

  const seeded = await maybeSeedSuperuserFromEnv();
  const users = await userCount();
  if (users === 0 && !seeded) {
    const code = getOrCreateSetupCode();
    logger.warn(
      `\n\n  ┌─ dashlab first-run setup ───────────────────────────────┐\n  │  No users yet. Open /setup and enter this code:          │\n  │                                                         │\n  │      ${code}                                       │\n  │                                                         │\n  └─────────────────────────────────────────────────────────┘\n`,
    );
  }

  // Content pipeline + scheduler wired in as those modules land.
  try {
    const { startContentPipeline } = await import("@/lib/content/pipeline");
    await startContentPipeline();
  } catch (err) {
    logger.debug({ err }, "content pipeline not started");
  }
  try {
    const { startScheduler } = await import("@/lib/server/scheduler/start");
    startScheduler();
  } catch (err) {
    logger.debug({ err }, "scheduler not started");
  }

  await db
    .update(settings)
    .set({ updatedAt: new Date() })
    .where(eq(settings.id, 1))
    .catch(() => {});
  g.__dashlabBoot!.done = true;
  logger.info("dashlab boot complete");
}

export function isBooted(): boolean {
  return g.__dashlabBoot!.done;
}
