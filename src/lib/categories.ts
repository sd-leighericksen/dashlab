import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, type Category } from "@/lib/db/schema";

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function createCategory(input: {
  slug: string;
  name: string;
  glyph?: string;
}): Promise<void> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${categories.sortOrder}),0)` })
    .from(categories);
  await db.insert(categories).values({
    slug: input.slug,
    name: input.name,
    glyph: input.glyph ?? `/${input.slug}`,
    sortOrder: Number(max) + 10,
  });
}

export async function updateCategory(
  id: number,
  patch: Partial<Pick<Category, "name" | "glyph">>,
): Promise<void> {
  await db.update(categories).set(patch).where(eq(categories.id, id));
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function moveCategory(id: number, dir: -1 | 1): Promise<void> {
  const all = await listCategories();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const swap = idx + dir;
  if (swap < 0 || swap >= all.length) return;
  const a = all[idx];
  const b = all[swap];
  await db.update(categories).set({ sortOrder: b.sortOrder }).where(eq(categories.id, a.id));
  await db.update(categories).set({ sortOrder: a.sortOrder }).where(eq(categories.id, b.id));
}
