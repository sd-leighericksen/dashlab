import type { Metadata } from "next";
import "../globals.css";
import { mono } from "@/lib/font";
import { getSettings } from "@/lib/settings";
import { readThemePref, resolveTheme } from "@/lib/theme-cookie";
import { accentStyle } from "@/lib/theme";
import type { CSSProperties } from "react";
import { pwaMetadata, pwaViewport } from "@/lib/pwa";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export const viewport = pwaViewport;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    ...pwaMetadata,
    title: settings.homelabName,
    robots: { index: false, follow: false, nocache: true },
  };
}

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
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
