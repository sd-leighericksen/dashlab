import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { BeszelSnapshot } from "@/lib/server/integrations/beszel/types";
import { IntegrationFrame } from "./IntegrationFrame";

export async function BeszelWidget({ href }: { href?: string }) {
  const snap = await readSnapshot("beszel", "overview", 30_000);
  const data = snap?.payload as BeszelSnapshot | undefined;
  return (
    <IntegrationFrame title="beszel" snap={snap} href={href}>
      {data ? (
        <ul className="flex flex-col gap-1">
          {data.systems.slice(0, 5).map((s) => (
            <li key={s.id} className="grid grid-cols-[1fr_auto] gap-2">
              <span className="truncate">
                <span className={s.status === "up" ? "text-ok" : s.status === "down" ? "text-err" : "text-fg-faint"}>
                  {s.status === "up" ? "●" : s.status === "down" ? "○" : "◌"}
                </span>{" "}
                {s.name}
              </span>
              <span className="text-fg-muted">
                cpu {s.cpuPct}% · ram {s.memPct}% · disk {s.diskPct}%
                {s.tempC != null ? ` · ${s.tempC}°C` : ""}
              </span>
            </li>
          ))}
          {data.alerts.length ? (
            <li className="mt-1 text-xs text-warn">▲ {data.alerts.length} active alert(s)</li>
          ) : null}
        </ul>
      ) : null}
    </IntegrationFrame>
  );
}
