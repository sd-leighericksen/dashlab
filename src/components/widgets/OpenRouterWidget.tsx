import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { OpenRouterSnapshot } from "@/lib/server/integrations/openrouter/integration";
import { IntegrationFrame } from "./IntegrationFrame";
import { Sparkline } from "./Sparkline";

const usd = (n: number) => `$${n.toFixed(2)}`;

export async function OpenRouterWidget({ href }: { href?: string }) {
  const snap = await readSnapshot("openrouter", "overview", 900_000);
  const data = snap?.payload as OpenRouterSnapshot | undefined;
  const last30 = data?.daily.slice(-30) ?? [];
  const spend30 = last30.reduce((s, d) => s + d.usd, 0);
  return (
    <IntegrationFrame title="openrouter" snap={snap} href={href}>
      {data ? (
        <div className="flex flex-col gap-1">
          {data.credits ? (
            <div className="flex justify-between">
              <span>balance</span>
              <span className="text-accent-ink">{usd(data.credits.remaining)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>today ≈</span>
            <span>{usd(data.todayApproxUsd)}</span>
          </div>
          <div className="flex justify-between">
            <span>30d {usd(spend30)}</span>
            <Sparkline values={last30.map((d) => d.usd)} ariaLabel="30-day spend" />
          </div>
          {data.byModel.slice(0, 2).map((m) => (
            <div key={m.model} className="flex justify-between text-xs text-fg-muted">
              <span className="truncate">{m.model}</span>
              <span>{usd(m.usd)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </IntegrationFrame>
  );
}
