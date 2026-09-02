import type { DashSection } from "@/lib/dashboards/queries";
import type { AddressType } from "@/lib/content/types";
import { preferredAddress } from "@/lib/content/addresses";

function glyphFor(name: string, icon?: string): string {
  // an emoji icon is used as-is; anything else falls back to the first letter
  if (icon && /\p{Extended_Pictographic}/u.test(icon)) return icon;
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function CardGrid({
  sections,
  preferred,
}: {
  sections: DashSection[];
  preferred: AddressType;
}) {
  const items = sections.flatMap((s) => s.items);
  if (!items.length) return <p className="text-sm text-fg-muted">no items</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ content, probe }) => {
        const fm = content.frontmatter as {
          card_url?: string;
          url?: string;
          icon?: string;
          urls?: { domain?: string; tailscale?: string; local?: string };
        };
        const url = fm.card_url ?? fm.url ?? preferredAddress(fm.urls, preferred)?.url ?? null;
        const state = (probe?.state as string) ?? "unknown";
        const dot = state === "up" ? "bg-ok" : state === "down" ? "bg-err" : "bg-fg-faint";
        const glyph = glyphFor(content.name, fm.icon);
        const Inner = (
          <>
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="flex h-14 w-14 items-center justify-center border border-border bg-bg text-3xl text-accent-ink"
              >
                {glyph}
              </span>
              <span className={`h-3 w-3 rounded-full ${dot}`} aria-label={state} role="img" />
            </div>
            <span className="mt-3 block truncate text-lg font-medium text-fg">{content.name}</span>
            {content.description ? (
              <span className="mt-1 block truncate text-xs text-fg-muted">{content.description}</span>
            ) : null}
          </>
        );
        return url ? (
          <a
            key={`${content.kind}:${content.slug}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block min-h-32 border border-border bg-bg-elevated p-4 transition-colors hover:border-accent-ink hover:bg-accent-soft"
          >
            {Inner}
          </a>
        ) : (
          <div
            key={`${content.kind}:${content.slug}`}
            className="block min-h-32 border border-border bg-bg-elevated p-4 opacity-60"
            title="no card_url set"
          >
            {Inner}
          </div>
        );
      })}
    </div>
  );
}
