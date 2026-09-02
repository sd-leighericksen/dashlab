import { requirePage } from "@/lib/auth/guard";
import { listDashboards } from "@/lib/dashboards/queries";
import { Heading, TextField, SaveButton, Notice } from "@/components/settings/fields";
import { newDashboard, makeDefault } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardsSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePage("admin");
  const list = await listDashboards();
  const { saved } = await searchParams;
  return (
    <div>
      <Heading path="dashboards" />
      <ul className="mb-6 flex flex-col gap-1 text-sm">
        {list.map((d) => (
          <li key={d.id} className="flex items-center gap-3 border-b border-border/40 py-1.5">
            <a href={`/settings/dashboards/${d.id}`} className="flex-1 text-fg hover:text-accent-ink">
              {d.name}
            </a>
            <a href={`/d/${d.slug}`} className="text-xs text-accent-ink" target="_blank" rel="noreferrer">
              /d/{d.slug} ↗
            </a>
            {d.isPublic ? <span className="text-xs text-warn">public</span> : null}
            {d.isDefault ? (
              <span className="text-xs text-ok">default</span>
            ) : (
              <form action={makeDefault}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-xs text-fg-muted hover:text-accent-ink">[set default]</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-sm text-accent-ink">+ new dashboard</h2>
      <form action={newDashboard} className="flex items-center gap-2 text-sm">
        <TextField name="name" placeholder="name" />
        <SaveButton label="create" />
      </form>
      {saved ? <Notice>saved</Notice> : null}
    </div>
  );
}
