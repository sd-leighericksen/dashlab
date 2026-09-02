import type { DashboardWidget } from "@/lib/db/schema";
import { BeszelWidget } from "@/components/widgets/BeszelWidget";
import { UptimeWidget } from "@/components/widgets/UptimeWidget";
import { OpenRouterWidget } from "@/components/widgets/OpenRouterWidget";

// Columns expand to fill the row based on how many widgets are enabled.
const SM: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2", 4: "sm:grid-cols-2" };
const LG: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

export function WidgetGrid({ widgets, slug }: { widgets: DashboardWidget[]; slug: string }) {
  if (!widgets.length) return null;
  const n = Math.min(widgets.length, 4);
  return (
    <div className={`grid grid-cols-1 gap-4 ${SM[n]} ${LG[n]}`}>
      {widgets.map((w) => {
        if (w.type === "beszel") return <BeszelWidget key={w.id} href={`/d/${slug}/w/beszel`} />;
        if (w.type === "uptime_kuma") return <UptimeWidget key={w.id} href={`/d/${slug}/w/uptime`} />;
        if (w.type === "openrouter") return <OpenRouterWidget key={w.id} href={`/d/${slug}/w/openrouter`} />;
        return null;
      })}
    </div>
  );
}
