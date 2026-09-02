import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "./client";
import {
  settings,
  categories,
  users,
  dashboards,
  dashboardCategories,
  dashboardWidgets,
} from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { dashboardSlug } from "@/lib/crypto/random";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";

const DEFAULT_CATEGORIES = [
  { slug: "media", name: "Media", glyph: "/media", sortOrder: 10 },
  { slug: "infra", name: "Infrastructure", glyph: "/infra", sortOrder: 20 },
  { slug: "dev", name: "Development", glyph: "/dev", sortOrder: 30 },
  { slug: "home", name: "Home", glyph: "/home", sortOrder: 40 },
  { slug: "monitoring", name: "Monitoring", glyph: "/monitoring", sortOrder: 50 },
  { slug: "external", name: "External Services", glyph: "/external", sortOrder: 60 },
];

export async function ensureSettings(): Promise<void> {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
}

export async function seedDefaultCategories(): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(categories);
  if (n > 0) return;
  await db.insert(categories).values(DEFAULT_CATEGORIES);
  logger.info("seeded default categories");
}

async function ensureDefaultDashboard(ownerId: string): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(dashboards);
  if (n > 0) return;
  const [dash] = await db
    .insert(dashboards)
    .values({
      slug: dashboardSlug(),
      name: "Main",
      ownerId,
      isDefault: true,
    })
    .returning({ id: dashboards.id, slug: dashboards.slug });
  const cats = await db.select().from(categories);
  if (cats.length) {
    await db.insert(dashboardCategories).values(
      cats.map((c, i) => ({
        dashboardId: dash.id,
        categorySlug: c.slug,
        sortOrder: i * 10,
        includeAll: true,
      })),
    );
  }
  await db.insert(dashboardWidgets).values([
    { dashboardId: dash.id, type: "beszel", sortOrder: 10 },
    { dashboardId: dash.id, type: "uptime_kuma", sortOrder: 20 },
    { dashboardId: dash.id, type: "openrouter", sortOrder: 30 },
  ]);
  logger.info({ slug: dash.slug }, "created default dashboard");
}

/** Create the first superuser from env vars, if configured and no users exist. */
export async function maybeSeedSuperuserFromEnv(): Promise<boolean> {
  const env = getEnv();
  if (!env.DASHLAB_SETUP_USERNAME || !env.DASHLAB_SETUP_PASSWORD) return false;
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) return false;
  const username = env.DASHLAB_SETUP_USERNAME.toLowerCase();
  const [u] = await db
    .insert(users)
    .values({
      username,
      displayName: env.DASHLAB_SETUP_USERNAME,
      passwordHash: await hashPassword(env.DASHLAB_SETUP_PASSWORD),
      role: "superuser",
    })
    .returning({ id: users.id });
  await ensureDefaultDashboard(u.id);
  await db.update(settings).set({ setupCompletedAt: new Date() }).where(eq(settings.id, 1));
  logger.info({ username }, "seeded superuser from env");
  return true;
}

/** Used by the /setup flow once the code is verified. */
export async function completeSetup(input: {
  username: string;
  password: string;
  displayName?: string;
  homelabName?: string;
}): Promise<{ userId: string }> {
  const username = input.username.toLowerCase();
  const [u] = await db
    .insert(users)
    .values({
      username,
      displayName: input.displayName ?? input.username,
      passwordHash: await hashPassword(input.password),
      role: "superuser",
    })
    .returning({ id: users.id });
  await ensureDefaultDashboard(u.id);
  await db
    .update(settings)
    .set({
      setupCompletedAt: new Date(),
      ...(input.homelabName ? { homelabName: input.homelabName } : {}),
    })
    .where(eq(settings.id, 1));
  return { userId: u.id };
}
