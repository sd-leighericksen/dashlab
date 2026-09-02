import "../globals.css";
import type { CSSProperties } from "react";
import { headers, cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { mono } from "@/lib/font";
import { getSettings } from "@/lib/settings";
import { accentStyle } from "@/lib/theme";
import { getActor } from "@/lib/auth/actor";
import { getDashboardBySlug, resolveTheme } from "@/lib/dashboards/queries";
import { canViewDashboard, canEditDashboard } from "@/lib/dashboards/access";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23000'/%3E%3C/svg%3E" },
};

function slugFromPath(path: string | null): string | null {
  if (!path) return null;
  const m = /^\/d\/([a-z0-9]{4,16})(?:\/|$)/.exec(path);
  return m ? m[1] : null;
}

export default async function DashRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const path = h.get("x-dashlab-pathname");
  const slug = slugFromPath(path);
  const settings = await getSettings();
  const dash = slug ? await getDashboardBySlug(slug) : null;
  if (!dash) notFound();

  const actor = await getActor();
  if (!(await canViewDashboard(actor, dash))) {
    if (!actor) redirect(`/login?next=${encodeURIComponent(path ?? "/")}`);
    notFound();
  }

  const cookieTheme = (await cookies()).get("dl-theme")?.value;
  const theme =
    cookieTheme === "light" || cookieTheme === "dark"
      ? cookieTheme
      : resolveTheme(dash, settings.themeDefault === "light" ? "light" : "dark");
  const accent = dash.accent ?? settings.accentDefault;
  const style = {
    ...accentStyle(accent),
    "--dl-scale": dash.scale,
  } as CSSProperties;

  const editor = await canEditDashboard(actor, dash);
  const showChrome = !dash.kiosk;

  return (
    <html
      lang="en"
      data-theme={theme}
      data-kiosk={dash.kiosk ? "1" : undefined}
      className={mono.variable}
      style={style}
      suppressHydrationWarning
    >
      <body>
        {showChrome ? (
          <header className="flex items-center justify-end gap-4 px-4 py-2 text-xs">
            <ThemeToggle />
            {actor ? (
              <>
                {editor ? (
                  <a href={`/settings/dashboards`} className="text-fg-muted hover:text-accent-ink">
                    [settings]
                  </a>
                ) : null}
                <a href="/logout" className="text-fg-muted hover:text-accent-ink">
                  [{actor.user.displayName ?? actor.user.username} ▾]
                </a>
              </>
            ) : null}
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
