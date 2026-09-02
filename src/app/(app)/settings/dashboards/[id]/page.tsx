import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { getDashboardConfig } from "@/lib/dashboards/mutations";
import { listCategories } from "@/lib/categories";
import { listUsers } from "@/lib/users";
import { listAll } from "@/lib/content/repo";
import { BANNER_FONTS } from "@/lib/banner";
import type { ContentKindT } from "@/lib/content/kinds";
import { Heading, Row, TextField, SelectField, SaveButton, Notice } from "@/components/settings/fields";
import { AccentPicker } from "@/components/settings/AccentPicker";
import { getSettings } from "@/lib/settings";
import { saveDashboard, regenSlug, removeDashboard } from "../actions";

export const dynamic = "force-dynamic";

const TOGGLES: { name: string; label: string }[] = [
  { name: "showDetailPages", label: "detail pages" },
  { name: "showWidgets", label: "widgets" },
  { name: "showExternal", label: "external services" },
  { name: "showServers", label: "servers" },
  { name: "showStatus", label: "status dots" },
  { name: "showPorts", label: "ports" },
  { name: "showServer", label: "server column" },
  { name: "showUptime", label: "uptime column" },
  { name: "showFilters", label: "filter bar" },
];
const WIDGET_TYPES = ["beszel", "uptime_kuma", "openrouter", "clock"];

export default async function EditDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePage("admin");
  const { id } = await params;
  const cfg = await getDashboardConfig(id);
  if (!cfg) notFound();
  const { dash, cats, widgets, members, items } = cfg;
  const { saved, error } = await searchParams;
  const allCats = await listCategories();
  const allUsers = await listUsers();
  const allContent = await listAll({ includeHidden: true });
  const settings = await getSettings();

  const contentByCat = new Map<string, typeof allContent>();
  for (const c of allContent) {
    const key = c.categorySlug ?? "uncategorised";
    const arr = contentByCat.get(key) ?? [];
    arr.push(c);
    contentByCat.set(key, arr);
  }

  const selectedCats = new Map(cats.map((c) => [c.categorySlug, c]));
  const selectedWidgets = new Set(widgets.map((w) => w.type));
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const curatedSet = new Set(items.map((it) => `${it.kind}:${it.slug}`));
  type ToggleKey =
    | "showDetailPages" | "showWidgets" | "showExternal" | "showServers" | "showStatus"
    | "showPorts" | "showServer" | "showUptime" | "showFilters";

  return (
    <div>
      <Heading path={`dashboards/${dash.name.toLowerCase().replace(/\s+/g, "-")}`} />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}

      <div className="mb-4 flex items-center gap-3 text-sm">
        <a href={`/d/${dash.slug}`} target="_blank" rel="noreferrer" className="text-accent-ink">/d/{dash.slug} ↗</a>
        <form action={regenSlug}>
          <input type="hidden" name="id" value={dash.id} />
          <button className="text-xs text-fg-muted hover:text-accent-ink">[regenerate url]</button>
        </form>
      </div>

      <form action={saveDashboard} className="flex flex-col gap-1">
        <input type="hidden" name="id" value={dash.id} />
        <Row label="name"><TextField name="name" defaultValue={dash.name} /></Row>
        <Row label="layout">
          <SelectField name="layout" defaultValue={dash.layout} options={[
            { value: "list", label: "list (terminal)" },
            { value: "cards", label: "cards (kid-friendly)" },
          ]} />
        </Row>
        <Row label="theme">
          <SelectField name="theme" defaultValue={dash.theme ?? ""} options={[
            { value: "", label: "(site default)" },
            { value: "dark", label: "dark" },
            { value: "light", label: "light" },
          ]} />
        </Row>
        <Row label="accent">
          <AccentPicker name="accent" defaultValue={dash.accent} fallback={settings.accentDefault} clearable />
        </Row>
        <Row label="banner_text"><TextField name="bannerText" defaultValue={dash.bannerText} placeholder="(site default)" /></Row>
        <Row label="banner_font">
          <SelectField name="bannerFont" defaultValue={dash.bannerFont ?? ""} options={[
            { value: "", label: "(site default)" },
            ...BANNER_FONTS.map((f) => ({ value: f, label: f })),
          ]} />
        </Row>
        <Row label="preferred_address">
          <SelectField name="addressType" defaultValue={dash.addressType ?? ""} options={[
            { value: "", label: "(site default)" },
            { value: "domain", label: "domain" },
            { value: "tailscale", label: "tailscale" },
            { value: "local", label: "local" },
          ]} />
        </Row>
        <Row label="refresh_seconds"><TextField name="refreshSeconds" type="number" defaultValue={dash.refreshSeconds} /></Row>
        <Row label="scale">
          <SelectField name="scale" defaultValue={dash.scale} options={[
            { value: "1", label: "1x" }, { value: "1.25", label: "1.25x" }, { value: "1.5", label: "1.5x" },
          ]} />
        </Row>

        <fieldset className="mt-3 border border-border p-3">
          <legend className="px-1 text-xs text-fg-muted">access</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked={dash.isPublic} className="accent-[var(--accent)]" />
            public (viewable by URL, no login — the 8-char slug is the only secret)
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" name="kiosk" defaultChecked={dash.kiosk} className="accent-[var(--accent)]" />
            kiosk (hide chrome, auto-refresh)
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" name="publicShowsPrivateAddresses" defaultChecked={dash.publicShowsPrivateAddresses} className="accent-[var(--accent)]" />
            public shows tailscale/local addresses + ports
          </label>
        </fieldset>

        <fieldset className="mt-3 border border-border p-3">
          <legend className="px-1 text-xs text-fg-muted">visibility</legend>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {TOGGLES.map((t) => (
              <label key={t.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={t.name} defaultChecked={dash[t.name as ToggleKey]} className="accent-[var(--accent)]" />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3 border border-border p-3">
          <legend className="px-1 text-xs text-fg-muted">categories &amp; items</legend>
          <p className="mb-2 text-xs text-fg-faint">
            Tick a category to include it. &quot;include all&quot; shows every item in it; untick to pick items individually below.
          </p>
          {allCats.map((c) => {
            const sel = selectedCats.get(c.slug);
            const catItems = contentByCat.get(c.slug) ?? [];
            return (
              <div key={c.id} className="mb-2 border-b border-border/30 pb-2">
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex w-48 items-center gap-2">
                    <input type="checkbox" name="cat" value={c.slug} defaultChecked={!!sel} className="accent-[var(--accent)]" />
                    <span className="text-accent-ink">/{c.slug}</span> {c.name}
                  </label>
                  <label className="flex items-center gap-1 text-xs text-fg-muted">
                    <input type="checkbox" name="cat_all" value={c.slug} defaultChecked={sel?.includeAll ?? true} className="accent-[var(--accent)]" />
                    include all items
                  </label>
                </div>
                {catItems.length ? (
                  <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {catItems.map((it) => (
                      <label key={`${it.kind}:${it.slug}`} className="flex items-center gap-1 text-xs text-fg-muted">
                        <input
                          type="checkbox"
                          name={`item:${c.slug}`}
                          value={`${it.kind}:${it.slug}`}
                          defaultChecked={curatedSet.has(`${it.kind}:${it.slug}`)}
                          className="accent-[var(--accent)]"
                        />
                        {it.name}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>

        <fieldset className="mt-3 border border-border p-3">
          <legend className="px-1 text-xs text-fg-muted">widgets</legend>
          <div className="flex flex-wrap gap-4">
            {WIDGET_TYPES.map((w) => (
              <label key={w} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="widget" value={w} defaultChecked={selectedWidgets.has(w)} className="accent-[var(--accent)]" />
                {w}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-3 border border-border p-3">
          <legend className="px-1 text-xs text-fg-muted">users</legend>
          {allUsers.map((u) => {
            const m = memberMap.get(u.id);
            return (
              <div key={u.id} className="flex items-center gap-4 text-sm">
                <label className="flex w-48 items-center gap-2">
                  <input type="checkbox" name="user" value={u.id} defaultChecked={!!m || u.id === dash.ownerId} className="accent-[var(--accent)]" />
                  {u.username}{u.id === dash.ownerId ? " (owner)" : ""}
                </label>
                <label className="flex items-center gap-1 text-xs text-fg-muted">
                  <input type="checkbox" name="canedit" value={u.id} defaultChecked={m?.canEdit ?? false} className="accent-[var(--accent)]" />
                  can edit
                </label>
              </div>
            );
          })}
        </fieldset>

        <div className="mt-4 flex items-center gap-4">
          <SaveButton />
          <a href="/settings/dashboards" className="text-xs text-fg-muted hover:text-accent-ink">[cancel]</a>
        </div>
        {saved ? <Notice>saved</Notice> : null}
      </form>

      <form action={removeDashboard} className="mt-8">
        <input type="hidden" name="id" value={dash.id} />
        <button className="text-xs text-err hover:underline">[ delete dashboard ]</button>
      </form>
    </div>
  );
}
