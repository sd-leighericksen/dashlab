import { requirePage } from "@/lib/auth/guard";
import { listCategories } from "@/lib/categories";
import { Heading, TextField, SaveButton, Notice } from "@/components/settings/fields";
import { addCategory, editCategory, removeCategory, reorderCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function CategoriesSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePage("admin");
  const cats = await listCategories();
  const { saved, error } = await searchParams;
  return (
    <div>
      <Heading path="categories" />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      <ul className="mb-6 flex flex-col gap-1 text-sm">
        {cats.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 border-b border-border/40 py-1">
            <form action={reorderCategory} className="flex">
              <input type="hidden" name="id" value={c.id} />
              <button name="dir" value="-1" disabled={i === 0} className="px-1 text-fg-muted hover:text-accent-ink disabled:opacity-30">▲</button>
              <button name="dir" value="1" disabled={i === cats.length - 1} className="px-1 text-fg-muted hover:text-accent-ink disabled:opacity-30">▼</button>
            </form>
            <form action={editCategory} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <span className="w-24 text-fg-faint">{c.slug}</span>
              <TextField name="name" defaultValue={c.name} />
              <TextField name="glyph" defaultValue={c.glyph} placeholder={`/${c.slug}`} />
              <button type="submit" className="text-xs text-fg-muted hover:text-accent-ink">[save]</button>
            </form>
            <form action={removeCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="text-xs text-err hover:underline">[del]</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm text-accent-ink">+ new category</h2>
      <form action={addCategory} className="flex flex-wrap items-center gap-2 text-sm">
        <TextField name="name" placeholder="name" />
        <TextField name="slug" placeholder="slug (auto)" />
        <TextField name="glyph" placeholder="/glyph" />
        <SaveButton label="add" />
      </form>
      {saved ? <Notice>saved</Notice> : null}
    </div>
  );
}
