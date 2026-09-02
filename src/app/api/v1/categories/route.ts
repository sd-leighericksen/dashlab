import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { listCategories, createCategory } from "@/lib/categories";
import { slugify } from "@/lib/crypto/random";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ auth: "required" }, async () => {
  const cats = await listCategories();
  return json({ items: cats.map((c) => ({ slug: c.slug, name: c.name, glyph: c.glyph, order: c.sortOrder })) });
});

export const POST = withApi({ role: "admin" }, async ({ req }) => {
  const b = await readJson<{ name: string; slug?: string; glyph?: string }>(req);
  if (!b?.name) throw err.badRequest("name required");
  const slug = slugify(b.slug ?? b.name);
  await createCategory({ name: b.name, slug, glyph: b.glyph });
  return json({ slug, name: b.name }, { status: 201 });
});
