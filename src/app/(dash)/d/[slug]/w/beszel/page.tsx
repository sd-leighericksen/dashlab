import { notFound } from "next/navigation";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { BeszelSnapshot } from "@/lib/server/integrations/beszel/types";
export const dynamic = "force-dynamic";

export default async function BeszelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dash = await getDashboardBySlug(slug);
  if (!dash || !dash.showWidgets) notFound();
  const snap = await readSnapshot("beszel", "overview", 30_000);
  const data = snap?.payload as BeszelSnapshot | undefined;
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 text-sm">
      <a href={`/d/${slug}`} className="text-xs text-fg-muted hover:text-accent-ink">[← back]</a>
      <h1 className="text-accent-ink">$ beszel · machine stats</h1>
      {!data ? (
        <p className="text-fg-faint">{snap?.status === "unconfigured" ? "not configured (set BESZEL_URL / BESZEL_EMAIL / BESZEL_PASSWORD)" : (snap?.error ?? "no data")}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-fg-muted">
              <th className="py-1">system</th><th>status</th><th>cpu</th><th>ram</th><th>disk</th><th>temp</th><th>uptime</th><th>agent</th>
            </tr>
          </thead>
          <tbody>
            {data.systems.map((s) => (
              <tr key={s.id} className="border-b border-border/40">
                <td className="py-1">{s.name} <span className="text-fg-faint">{s.hostname}</span></td>
                <td className={s.status === "up" ? "text-ok" : "text-err"}>{s.status}</td>
                <td>{s.cpuPct}%</td><td>{s.memPct}%</td><td>{s.diskPct}%</td>
                <td>{s.tempC != null ? `${s.tempC}°C` : "—"}</td>
                <td>{Math.round(s.uptimeSec / 86400)}d</td>
                <td className="text-fg-muted">{s.agentVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
