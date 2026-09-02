import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { UptimeSnapshot } from "@/lib/server/integrations/uptime-kuma/integration";
import { IntegrationFrame } from "./IntegrationFrame";

export async function UptimeWidget({ href }: { href?: string }) {
  const snap = await readSnapshot("uptime_kuma", "overview", 60_000);
  const data = snap?.payload as UptimeSnapshot | undefined;
  const down = data?.monitors.filter((m) => m.status === "down") ?? [];
  return (
    <IntegrationFrame title="uptime kuma" snap={snap} href={href}>
      {data ? (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span>{data.summary.total} monitors</span>
            <span>
              <span className="text-ok">● {data.summary.up}</span>
              {data.summary.down ? <span className="text-err"> ○ {data.summary.down}</span> : null}
            </span>
          </div>
          {down.slice(0, 4).map((m) => (
            <div key={m.id} className="flex justify-between text-xs">
              <span className="text-err">○ {m.name}</span>
              <span className="text-fg-muted">{m.group}</span>
            </div>
          ))}
          {!down.length ? <span className="text-xs text-ok">all systems operational</span> : null}
        </div>
      ) : null}
    </IntegrationFrame>
  );
}
