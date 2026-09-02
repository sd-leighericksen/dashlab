import { notFound } from "next/navigation";
import { getDashboardBySlug } from "@/lib/dashboards/queries";
import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { OpenRouterSnapshot } from "@/lib/server/integrations/openrouter/integration";
import { Sparkline } from "@/components/widgets/Sparkline";
export const dynamic = "force-dynamic";
const usd = (n: number) => `$${n.toFixed(2)}`;

export default async function OpenRouterDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dash = await getDashboardBySlug(slug);
  if (!dash || !dash.showWidgets) notFound();
  const snap = await readSnapshot("openrouter", "overview", 900_000);
  const data = snap?.payload as OpenRouterSnapshot | undefined;
  const last30 = data?.daily.slice(-30) ?? [];
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 text-sm">
      <a href={`/d/${slug}`} className="text-xs text-fg-muted hover:text-accent-ink">[← back]</a>
      <h1 className="text-accent-ink">$ openrouter · usage</h1>
      {!data ? (
        <p className="text-fg-faint">{snap?.status === "unconfigured" ? "not configured (set OPENROUTER_MANAGEMENT_KEY)" : (snap?.error ?? "no data")}</p>
      ) : (
        <>
          {data.credits ? (
            <p>balance <span className="text-accent-ink">{usd(data.credits.remaining)}</span> · bought {usd(data.credits.total)} · used {usd(data.credits.used)} · today ≈ {usd(data.todayApproxUsd)}</p>
          ) : null}
          <p className="text-fg-muted">30d spend {usd(last30.reduce((s, d) => s + d.usd, 0))} <Sparkline values={last30.map((d) => d.usd)} /> <span className="text-xs">(UTC days)</span></p>
          <h2 className="mt-2 text-accent-ink">by model</h2>
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-border text-left text-fg-muted"><th className="py-1">model</th><th>spend</th><th>in</th><th>out</th></tr></thead>
            <tbody>
              {data.byModel.map((m) => (
                <tr key={m.model} className="border-b border-border/40">
                  <td className="py-1">{m.model}</td><td>{usd(m.usd)}</td>
                  <td className="text-fg-muted">{m.promptTokens.toLocaleString()}</td>
                  <td className="text-fg-muted">{m.completionTokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
