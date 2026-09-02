"use client";
import { useMemo, useState } from "react";
import type { DashSection } from "@/lib/dashboards/queries";
import type { AddressType } from "@/lib/content/types";
import { ItemRow, type RowVisibility } from "./ItemRow";

export type MachineStat = { cpu: number | null; mem: number | null; disk: number | null; temp: number | null };

export type BodyConfig = {
  preferred: AddressType;
  visibility: RowVisibility;
  detailBase: string | null;
  showDetailPages: boolean;
  showFilters: boolean;
  machineStats: Record<string, MachineStat>;
};

const KIND_SEG: Record<string, string> = { service: "s", server: "h", external: "x", bookmark: "b" };

type FlatItem = DashSection["items"][number];

export function DashboardBody({
  sections,
  config,
}: {
  sections: DashSection[];
  config: BodyConfig;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"category" | "server">("category");

  const catChips = ["all", ...sections.map((s) => s.slug)];

  const matches = (it: FlatItem) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = `${it.content.name} ${it.content.description ?? ""} ${it.content.tags.join(" ")} ${it.content.serverSlug ?? ""}`.toLowerCase();
    return hay.includes(needle);
  };

  const view = useMemo(() => {
    if (groupBy === "category") {
      return sections
        .filter((s) => cat === "all" || s.slug === cat)
        .map((s) => ({ ...s, items: s.items.filter(matches) }))
        .filter((s) => s.items.length > 0);
    }
    // group by machine (server)
    const all = sections.flatMap((s) => s.items).filter(matches);
    const seen = new Set<string>();
    const items = all.filter((it) => {
      const k = `${it.content.kind}:${it.content.slug}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const servers = items.filter((it) => it.content.kind === "server");
    const serverNames = new Map(servers.map((s) => [s.content.slug, s.content.name]));
    const groups = new Map<string, { name: string; items: FlatItem[] }>();
    const ensure = (slug: string, name: string) => {
      if (!groups.has(slug)) groups.set(slug, { name, items: [] });
      return groups.get(slug)!;
    };
    for (const s of servers) ensure(s.content.slug, s.content.name).items.push(s);
    for (const it of items) {
      if (it.content.kind === "server") continue;
      if (it.content.kind === "service" && it.content.serverSlug) {
        const slug = it.content.serverSlug;
        ensure(slug, serverNames.get(slug) ?? slug).items.push(it);
      } else {
        ensure(it.content.kind === "external" ? "__external" : "__unassigned",
          it.content.kind === "external" ? "external" : "unassigned").items.push(it);
      }
    }
    return [...groups.entries()]
      .map(([slug, g]) => ({ slug, name: g.name, glyph: `/${g.name}`, items: g.items }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => (a.slug.startsWith("__") ? 1 : 0) - (b.slug.startsWith("__") ? 1 : 0) || a.name.localeCompare(b.name));
  }, [sections, q, cat, groupBy]);

  return (
    <div className="flex flex-col gap-6">
      {config.showFilters ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-accent-ink">$ grep</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="filter services"
              aria-label="Filter services"
              className="w-48 border-b border-border bg-transparent px-1 py-0.5 outline-none focus:border-accent-ink"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-fg-faint">group:</span>
              {(["category", "server"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`border px-2 py-0.5 ${groupBy === g ? "border-accent-ink bg-accent-soft text-accent-ink" : "border-border text-fg-muted hover:text-accent-ink"}`}
                >
                  {g === "category" ? "category" : "machine"}
                </button>
              ))}
            </span>
            {groupBy === "category" ? (
              <div role="radiogroup" className="flex flex-wrap gap-1">
                {catChips.map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={cat === c}
                    onClick={() => setCat(c)}
                    className={`border px-2 py-0.5 ${cat === c ? "border-accent-ink bg-accent-soft text-accent-ink" : "border-border text-fg-muted hover:text-accent-ink"}`}
                  >
                    [{c}]
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view.length === 0 ? (
        <p className="text-sm text-fg-muted">grep: no matches</p>
      ) : (
        view.map((section) => (
          <section key={section.slug}>
            <h2 className="mb-1 flex items-baseline gap-3 text-sm text-fg-muted">
              <span className="text-accent-ink">{section.glyph ?? `/${section.slug}`}</span>
              <span className="text-xs">{section.items.length} items</span>
            </h2>
            <ul className="divide-y divide-border/40">
              {section.items.map((it) => (
                <ItemRow
                  key={`${it.content.kind}:${it.content.slug}`}
                  item={it.content}
                  probe={it.probe}
                  preferred={config.preferred}
                  visible={config.visibility}
                  serverStats={it.content.kind === "server" ? config.machineStats[it.content.slug] : undefined}
                  detailHref={
                    config.showDetailPages && config.detailBase
                      ? `${config.detailBase}/${KIND_SEG[it.content.kind]}/${it.content.slug}`
                      : null
                  }
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
