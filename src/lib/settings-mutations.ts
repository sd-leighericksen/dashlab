import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings, type Settings } from "@/lib/db/schema";

export type SettingsPatch = Partial<
  Pick<
    Settings,
    | "homelabName" | "bannerText" | "bannerFont" | "themeDefault" | "accentDefault"
    | "addressDefault" | "openInDefault" | "probeIntervalS" | "probeTimeoutMs"
    | "probeConcurrency" | "probeRetentionDays" | "bigScreenScale" | "timezone"
  >
>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  await db.update(settings).set({ ...patch, updatedAt: new Date() }).where(eq(settings.id, 1));
}
