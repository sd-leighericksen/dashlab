import type { DashboardWidget } from "@/lib/db/schema";
import { BeszelWidget } from "@/components/widgets/BeszelWidget";
import { UptimeWidget } from "@/components/widgets/UptimeWidget";
import { OpenRouterWidget } from "@/components/widgets/OpenRouterWidget";

export function WidgetGrid({ widgets, slug }: { widgets: DashboardWidget[]; slug: string }) {
  if (!widgets.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => {
        if (w.type === "beszel") return <BeszelWidget key={w.id} href={`/d/${slug}/w/beszel`} />;
        if (w.type === "uptime_kuma") return <UptimeWidget key={w.id} href={`/d/${slug}/w/uptime`} />;
        if (w.type === "openrouter") return <OpenRouterWidget key={w.id} href={`/d/${slug}/w/openrouter`} />;
        return null;
      })}
    </div>
  );
}
