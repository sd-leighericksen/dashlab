import { requirePage } from "@/lib/auth/guard";
import { Heading, TextField, SelectField, SaveButton } from "@/components/settings/fields";
import { createContent } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePage("admin");
  const { error } = await searchParams;
  return (
    <div>
      <Heading path="content/new" />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      <form action={createContent} className="flex flex-col gap-1">
        <label className="grid grid-cols-[12rem_1fr] items-center gap-3 py-1 text-sm">
          <span className="text-fg-muted">kind</span>
          <SelectField
            name="kind"
            defaultValue="service"
            options={[
              { value: "service", label: "service" },
              { value: "server", label: "server" },
              { value: "external", label: "external" },
              { value: "bookmark", label: "bookmark" },
            ]}
          />
        </label>
        <label className="grid grid-cols-[12rem_1fr] items-center gap-3 py-1 text-sm">
          <span className="text-fg-muted">name</span>
          <TextField name="name" placeholder="Jellyfin" />
        </label>
        <label className="grid grid-cols-[12rem_1fr] items-center gap-3 py-1 text-sm">
          <span className="text-fg-muted">slug</span>
          <TextField name="slug" placeholder="(auto from name)" />
        </label>
        <div className="mt-3 flex items-center gap-4">
          <SaveButton label="create + edit" />
          <a href="/settings/content" className="text-xs text-fg-muted hover:text-accent-ink">[cancel]</a>
        </div>
      </form>
    </div>
  );
}
