import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import {
  getDashboardBySlug,
  getFullDashboard,
} from "@/lib/dashboards/queries";
import { Banner } from "@/components/dashboard/Banner";
import { StatusLine } from "@/components/dashboard/StatusLine";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";
import { DashboardBody, type BodyConfig } from "@/components/dashboard/DashboardBody";
import { CardGrid } from "@/components/dashboard/CardGrid";
import { Credit } from "@/components/ui/Credit";
import { readSnapshot } from "@/lib/server/integrations/snapshots";
import type { BeszelSnapshot } from "@/lib/server/integrations/beszel/types";
import type { MachineStat } from "@/components/dashboard/DashboardBody";
import type { AddressType } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dash = await getDashboardBySlug(slug);
  if (!dash) notFound();
  const settings = await getSettings();
  const full = await getFullDashboard(dash);

  // map Beszel systems onto server rows (by beszel_system, name, or hostname)
  const beszel = (await readSnapshot("beszel", "overview", 30_000))?.payload as BeszelSnapshot | undefined;
  const machineStats: Record<string, MachineStat> = {};
  if (beszel) {
    const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const section of full.sections) {
      for (const it of section.items) {
        if (it.content.kind !== "server") continue;
        const fm = it.content.frontmatter as { hostname?: string; monitors?: { beszel_system?: string | null } };
        const wanted = [fm.monitors?.beszel_system, it.content.name, it.content.slug, fm.hostname].filter(Boolean).map((x) => norm(String(x)));
        const sys = beszel.systems.find((sys) => wanted.includes(norm(sys.id)) || wanted.includes(norm(sys.name)) || wanted.includes(norm(sys.hostname)));
        if (sys) machineStats[it.content.slug] = { cpu: sys.cpuPct, mem: sys.memPct, disk: sys.diskPct, temp: sys.tempC };
      }
    }
  }

  const bannerText = dash.bannerText ?? settings.bannerText ?? settings.homelabName;
  const bannerFont = dash.bannerFont ?? settings.bannerFont;
  const preferred = (dash.addressType ?? settings.addressDefault) as AddressType;
  const promptName = settings.homelabName.toLowerCase().replace(/\s+/g, "");

  const config: BodyConfig = {
    preferred,
    visibility: {
      showPorts: dash.showPorts,
      showServer: dash.showServer,
      showUptime: dash.showUptime && dash.showStatus,
      showBadges: true,
    },
    detailBase: `/d/${dash.slug}`,
    showDetailPages: dash.showDetailPages,
    showFilters: dash.showFilters,
    machineStats,
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-2">
      <Banner text={bannerText.toUpperCase()} font={bannerFont} ariaLabel={bannerText} />
      <StatusLine prompt={`${promptName}@dashlab:~$`} counts={full.counts} />
      {dash.showWidgets ? <WidgetGrid widgets={full.widgets} slug={dash.slug} /> : null}
      {dash.layout === "cards" ? (
        <CardGrid sections={full.sections} preferred={preferred} />
      ) : (
        <DashboardBody sections={full.sections} config={config} />
      )}
      <footer className="border-t border-border pt-3 text-xs text-fg-faint">
        dashlab v0.1.0 · {settings.homelabName.toLowerCase()} · {full.counts.total} items
      </footer>
      {!dash.kiosk ? <Credit className="pb-2" /> : null}
    </main>
  );
}
