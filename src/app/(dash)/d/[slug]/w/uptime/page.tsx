import { notFound } from "next/navigation";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { UptimeSnapshot } from "@/lib/server/integrations/uptime-kuma/integration";
export const dynamic = "force-dynamic";

export default async function UptimeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dash = await getDashboardBySlug(slug);
  if (!dash || !dash.showWidgets) notFound();
  const snap = await readSnapshot("uptime_kuma", "overview", 60_000);
  const data = snap?.payload as UptimeSnapshot | undefined;
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 text-sm">
      <a href={`/d/${slug}`} className="text-xs text-fg-muted hover:text-accent-ink">[← back]</a>
      <h1 className="text-accent-ink">$ uptime kuma · monitors</h1>
      {!data ? (
        <p className="text-fg-faint">{snap?.status === "unconfigured" ? "not configured (set UPTIME_KUMA_URL / UPTIME_KUMA_STATUS_SLUG)" : (snap?.error ?? "no data")}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-fg-muted">
              <th className="py-1">monitor</th><th>group</th><th>status</th><th>24h</th><th>ping</th>
            </tr>
          </thead>
          <tbody>
            {data.monitors.map((m) => (
              <tr key={m.id} className="border-b border-border/40">
                <td className="py-1">{m.name}</td>
                <td className="text-fg-muted">{m.group}</td>
                <td className={m.status === "up" ? "text-ok" : m.status === "down" ? "text-err" : "text-fg-faint"}>{m.status}</td>
                <td>{m.uptime24h != null ? `${(m.uptime24h * 100).toFixed(2)}%` : "—"}</td>
                <td>{m.lastPingMs != null ? `${m.lastPingMs}ms` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
