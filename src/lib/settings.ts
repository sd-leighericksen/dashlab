import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings, type Settings } from "@/lib/db/schema";

const FALLBACK: Settings = {
  id: 1,
  homelabName: "Nimbus Cloud",
  bannerText: null,
  bannerFont: "ANSI Shadow",
  themeDefault: "dark",
  accentDefault: "#f3b445",
  addressDefault: "domain",
  openInDefault: "new_tab",
  probeIntervalS: 60,
  probeTimeoutMs: 5000,
  probeConcurrency: 6,
  probeRetentionDays: 7,
  bigScreenScale: "1",
  timezone: "Australia/Melbourne",
  setupCompletedAt: null,
  extra: {},
  updatedAt: new Date(),
};

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
    return row ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
});
