import type { ContentRow, ProbeState } from "@/lib/db/schema";
import type { ContentKindT } from "@/lib/content/kinds";
import { appAddresses } from "@/lib/content/addresses";
import type { AddressType } from "@/lib/content/types";

const KIND_SECTION: Record<ContentKindT, string> = {
  service: "Services",
  server: "Servers",
  external: "External Services",
};

function KeyVal({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2">
      <span className="text-fg-muted">{k}</span>
      <span className="text-fg">{v}</span>
    </div>
  );
}

export function ManPage({
  kind,
  row,
  probe,
  preferred,
  homelabName,
  detailBase,
  related,
  backHref,
  editHref,
}: {
  kind: ContentKindT;
  row: ContentRow;
  probe: ProbeState | null;
  preferred: AddressType;
  homelabName: string;
  detailBase: string | null;
  related: { kind: ContentKindT; slug: string; name: string }[];
  backHref: string;
  editHref?: string | null;
}) {
  const fm = row.frontmatter as Record<string, unknown>;
  const title = row.name.toUpperCase().replace(/\s+/g, "");
  const section = KIND_SECTION[kind];
  const addresses = appAddresses(fm.urls as never, preferred);
  const state = (probe?.state as string) ?? "unknown";
  const dot = state === "up" ? "●" : state === "down" ? "○" : "◌";
  const dotColor = state === "up" ? "text-ok" : state === "down" ? "text-err" : "text-fg-faint";
  const seg: Record<ContentKindT, string> = { service: "s", server: "h", external: "x" };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-16 pt-2 text-sm">
      <div className="flex items-center justify-between text-xs">
        <a href={backHref} className="text-fg-muted hover:text-accent-ink">
          [← back]
        </a>
        {editHref ? (
          <a href={editHref} className="text-accent-ink hover:underline">
            [edit]
          </a>
        ) : null}
      </div>

      <div className="flex justify-between text-fg-muted">
        <span>{title}(1)</span>
        <span>{homelabName} {section}</span>
        <span>{title}(1)</span>
      </div>

      <section>
        <h2 className="text-accent-ink">NAME</h2>
        <p className="pl-6">
          {row.name}
          {row.description ? ` — ${row.description}` : ""}
        </p>
      </section>

      {probe && state !== "disabled" ? (
        <section>
          <h2 className="text-accent-ink">STATUS</h2>
          <p className="pl-6">
            <span className={dotColor}>{dot} {state}</span>
            {probe.uptime24h != null ? ` · ${probe.uptime24h}% (24h)` : ""}
            {probe.uptime7d != null ? ` · ${probe.uptime7d}% (7d)` : ""}
            {probe.lastLatencyMs != null ? ` · ${probe.lastLatencyMs}ms` : ""}
            {probe.lastError ? ` · ${probe.lastError}` : ""}
          </p>
        </section>
      ) : null}

      {addresses.length ? (
        <section>
          <h2 className="text-accent-ink">SYNOPSIS</h2>
          <div className="flex flex-col gap-1 pl-6">
            {addresses.map((a, i) => (
              <a
                key={a.type}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-fg hover:text-accent-ink"
              >
                {a.url} <span className="text-fg-muted">[{a.label}]</span>
                {i === 0 ? <span className="text-accent-ink"> ← preferred</span> : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-accent-ink">CONFIG</h2>
        <div className="flex flex-col gap-0.5 pl-6">
          <KeyVal k="category" v={row.categorySlug ? `/${row.categorySlug}` : null} />
          {kind === "service" ? (
            <KeyVal
              k="server"
              v={
                row.serverSlug && detailBase ? (
                  <a href={`${detailBase}/h/${row.serverSlug}`} className="text-accent-ink">
                    {row.serverSlug}
                  </a>
                ) : (
                  row.serverSlug
                )
              }
            />
          ) : null}
          <KeyVal k="port" v={(fm.port as number) ?? null} />
          {kind === "server" ? (
            <>
              <KeyVal k="hostname" v={(fm.hostname as string) ?? null} />
              <KeyVal k="os" v={(fm.os as string) ?? null} />
              <KeyVal k="location" v={(fm.location as string) ?? null} />
            </>
          ) : null}
          {kind === "external" ? (
            <>
              <KeyVal k="provider" v={(fm.provider as string) ?? null} />
              <KeyVal k="type" v={(fm.type as string) ?? null} />
            </>
          ) : null}
          <KeyVal k="status" v={(fm.status as string) ?? null} />
          <KeyVal k="tags" v={row.tags.length ? `[${row.tags.join(", ")}]` : null} />
          <KeyVal k="file" v={row.path} />
        </div>
      </section>

      {row.bodyHtml ? (
        <section>
          <h2 className="text-accent-ink">DESCRIPTION</h2>
          <article
            className="man pl-6"
            dangerouslySetInnerHTML={{ __html: row.bodyHtml }}
          />
        </section>
      ) : null}

      {related.length ? (
        <section>
          <h2 className="text-accent-ink">SEE ALSO</h2>
          <p className="pl-6">
            {related.map((r, i) => (
              <span key={`${r.kind}:${r.slug}`}>
                {detailBase ? (
                  <a href={`${detailBase}/${seg[r.kind]}/${r.slug}`} className="text-accent-ink">
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
                {i < related.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </section>
      ) : null}

      <footer className="border-t border-border pt-3 text-xs text-fg-faint">
        {homelabName} · {row.mtime ? new Date(row.mtime).toISOString().slice(0, 10) : ""} · {row.path}
      </footer>
    </main>
  );
}
