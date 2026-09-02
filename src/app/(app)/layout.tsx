import type { Metadata } from "next";
import "../globals.css";
import { mono } from "@/lib/font";
import { getSettings } from "@/lib/settings";
import { readThemePref, resolveTheme } from "@/lib/theme-cookie";
import { accentStyle } from "@/lib/theme";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "dashlab",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23000'/%3E%3C/svg%3E" },
};

export default async function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const theme = resolveTheme(await readThemePref(), settings.themeDefault);
  const style = accentStyle(settings.accentDefault) as CSSProperties;
  return (
    <html
      lang="en"
      data-theme={theme}
      className={mono.variable}
      style={style}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
