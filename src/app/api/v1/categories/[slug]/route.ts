import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { listCategories, updateCategory, deleteCategory } from "@/lib/categories";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function findId(slug: string): Promise<number | null> {
  const c = (await listCategories()).find((x) => x.slug === slug);
  return c?.id ?? null;
}

export const PATCH = withApi({ role: "admin" }, async ({ req, params }) => {
  const id = await findId(params.slug);
  if (id == null) throw err.notFound();
  const b = await readJson<{ name?: string; glyph?: string }>(req);
  await updateCategory(id, { name: b.name, glyph: b.glyph });
  return json({ ok: true });
});

export const DELETE = withApi({ role: "admin" }, async ({ params }) => {
  const id = await findId(params.slug);
  if (id == null) throw err.notFound();
  await deleteCategory(id);
  return new Response(null, { status: 204 });
});
