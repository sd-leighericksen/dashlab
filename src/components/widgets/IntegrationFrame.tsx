import type { ReactNode } from "react";
import type { SnapshotView } from "@/lib/server/integrations/snapshots";

function ago(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  stale: "STALE",
  unreachable: "ERR",
  auth_failed: "AUTH",
  upstream_error: "ERR",
  unconfigured: "--",
};

export function IntegrationFrame({
  title,
  snap,
  children,
  href,
}: {
  title: string;
  snap: SnapshotView | null;
  children: ReactNode;
  href?: string;
}) {
  const status = snap?.status ?? "unconfigured";
  const label = STATUS_LABEL[status] ?? "ERR";
  const dim = status === "stale" || status === "unreachable";
  const showData = status === "ok" || status === "stale";
  const labelColor =
    status === "ok" ? "text-ok" : status === "unconfigured" ? "text-fg-faint" : status === "auth_failed" ? "text-warn" : "text-err";

  return (
    <section className="relative border border-border bg-bg-elevated">
      <span className="absolute -top-[0.7em] left-3 bg-bg px-1 text-xs text-fg-muted">
        ┌─ {title}
      </span>
      <div className="p-4 text-sm">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className={labelColor}>{label}</span>
          <span className="text-fg-faint">
            {status === "unconfigured"
              ? "not configured"
              : status === "auth_failed"
                ? snap?.error ?? "auth failed"
                : `updated ${ago(snap?.fetchedAt ?? null)}`}
          </span>
        </div>
        {status === "unconfigured" ? (
          <p className="text-fg-faint">-- set env vars to enable</p>
        ) : !showData ? (
          <p className="text-err">{snap?.error ?? "unavailable"}</p>
        ) : (
          <div className={dim ? "opacity-60" : ""}>{children}</div>
        )}
        {href ? (
          <div className="mt-3 text-right text-xs">
            <a href={href} className="text-fg-muted hover:text-accent-ink">more ›</a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
