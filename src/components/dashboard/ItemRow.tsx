"use client";
import { useState, useRef, useCallback } from "react";
import type { ContentRow, ProbeState } from "@/lib/db/schema";
import type { AddressType } from "@/lib/content/types";
import { appAddresses, type AddressOption } from "@/lib/content/addresses";

const OPEN_TARGET: Record<string, string> = {
  new_tab: "_blank",
  same_tab: "_self",
  overlay: "_blank",
};

export type RowVisibility = {
  showPorts: boolean;
  showServer: boolean;
  showUptime: boolean;
  showBadges: boolean;
};

export type ServerStats = { cpu: number | null; mem: number | null; disk: number | null; temp: number | null };

export function ItemRow({
  item,
  probe,
  preferred,
  detailHref,
  visible,
  serverStats,
}: {
  item: ContentRow;
  probe: ProbeState | null;
  preferred: AddressType;
  detailHref: string | null;
  visible: RowVisibility;
  serverStats?: ServerStats;
}) {
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fm = item.frontmatter as {
    urls?: { domain?: string; tailscale?: string; local?: string };
    port?: number;
    open_in?: string;
  };
  const addresses = appAddresses(fm.urls, preferred);
  const primary: AddressOption | null = addresses[0] ?? null;
  const openIn = fm.open_in ?? "new_tab";
  const state = (probe?.state as string) ?? "unknown";
  const glyph = state === "up" ? "●" : state === "down" ? "○" : "◌";
  const glyphColor =
    state === "up" ? "text-ok" : state === "down" ? "text-err" : "text-fg-faint";

  const onPointerDown = useCallback(() => {
    if (addresses.length <= 1) return;
    pressTimer.current = setTimeout(() => setOpen(true), 500);
  }, [addresses.length]);
  const clearPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const uptime = probe?.uptime24h != null ? `${probe.uptime24h}%` : "—";
  const down = state === "down" && probe?.lastError;

  return (
    <li
      className="group relative flex items-center gap-2 border-l-2 border-transparent px-1 py-2.5 text-sm hover:border-accent-ink hover:bg-accent-soft sm:py-1"
      onMouseLeave={() => setOpen(false)}
    >
      <span role="img" aria-label={state} className={`inline-block w-[2ch] shrink-0 text-center ${glyphColor}`}>
        {glyph}
      </span>

      {/* name + details */}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {primary ? (
          <a
            href={primary.url}
            target={OPEN_TARGET[openIn]}
            rel="noreferrer"
            onPointerDown={onPointerDown}
            onPointerUp={clearPress}
            onPointerLeave={clearPress}
            className="truncate text-fg hover:text-accent-ink"
            title={primary.url}
          >
            {item.name}
          </a>
        ) : (
          <span className="truncate text-fg-muted">{item.name}</span>
        )}
        {detailHref ? (
          <a href={detailHref} className="shrink-0 text-xs text-fg-muted hover:text-accent-ink" title={`details for ${item.name}`}>
            [details]
          </a>
        ) : null}
      </span>

      {/* server machine stats (Beszel) */}
      {item.kind === "server" ? (
        <span className="hidden shrink-0 items-center gap-3 font-mono text-xs text-fg-muted sm:flex">
          <span className="w-[9ch]" title="cpu">cpu {serverStats?.cpu != null ? `${serverStats.cpu}%` : "—"}</span>
          <span className="w-[9ch]" title="memory">mem {serverStats?.mem != null ? `${serverStats.mem}%` : "—"}</span>
          <span className="w-[10ch]" title="disk">disk {serverStats?.disk != null ? `${serverStats.disk}%` : "—"}</span>
          <span className="w-[7ch]" title="temperature">{serverStats?.temp != null ? `${serverStats.temp}°C` : "—"}</span>
        </span>
      ) : null}

      {/* metadata (responsive) */}
      {item.kind !== "server" && visible.showPorts && fm.port ? (
        <span className="hidden w-[6ch] shrink-0 text-fg-muted sm:inline">:{fm.port}</span>
      ) : null}
      {visible.showServer && item.serverSlug ? (
        <span className="hidden w-[8ch] shrink-0 truncate text-fg-muted md:inline">{item.serverSlug}</span>
      ) : null}

      {down ? (
        <span className="shrink-0 text-xs text-err">down · {probe?.lastError?.slice(0, 24)}</span>
      ) : visible.showBadges ? (
        <span className="flex shrink-0 items-center gap-1">
          {addresses.length === 0 ? (
            <span className="text-fg-faint">—</span>
          ) : (
            addresses.map((a, i) => (
              <a
                key={a.type}
                href={a.url}
                target={OPEN_TARGET[openIn]}
                rel="noreferrer"
                className={`hidden text-xs sm:inline ${i === 0 ? "text-accent-ink" : "text-fg-muted hover:text-accent-ink"}`}
              >
                [{a.label}]
              </a>
            ))
          )}
          {addresses.length > 1 ? (
            <button
              type="button"
              aria-label="show addresses"
              onClick={() => setOpen((v) => !v)}
              className="min-h-11 min-w-11 text-fg-muted hover:text-accent-ink sm:hidden"
            >
              ⋯
            </button>
          ) : null}
        </span>
      ) : null}

      {visible.showUptime ? (
        <span className="hidden w-[5ch] shrink-0 text-right text-fg-muted sm:inline">{uptime}</span>
      ) : null}

      {open && addresses.length > 1 ? (
        <div role="menu" className="absolute right-2 top-full z-20 mt-1 min-w-56 border border-border bg-bg-elevated p-2 text-sm shadow-lg">
          <div className="mb-1 text-xs text-fg-muted">{item.name}</div>
          {addresses.map((a) => (
            <a
              key={a.type}
              role="menuitem"
              href={a.url}
              target={OPEN_TARGET[openIn]}
              rel="noreferrer"
              className="block px-1 py-1 text-fg hover:bg-accent-soft hover:text-accent-ink"
            >
              [{a.label}] {a.url}
            </a>
          ))}
        </div>
      ) : null}
    </li>
  );
}
