"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { updateSettings } from "@/lib/settings-mutations";
import { isHexColor } from "@/lib/theme";

export async function saveGeneral(formData: FormData): Promise<void> {
  await requirePage("superuser");
  const accent = String(formData.get("accentDefault") ?? "").trim();
  if (accent && !isHexColor(accent)) redirect("/settings/general?error=accent+must+be+hex");
  await updateSettings({
    homelabName: String(formData.get("homelabName") ?? "").trim() || "Nimbus Cloud",
    bannerText: String(formData.get("bannerText") ?? "").trim() || null,
    bannerFont: String(formData.get("bannerFont") ?? "ANSI Shadow"),
    themeDefault: String(formData.get("themeDefault") ?? "dark") as "dark" | "light",
    accentDefault: accent || "#f3b445",
    addressDefault: String(formData.get("addressDefault") ?? "domain") as "domain" | "tailscale" | "local",
    probeIntervalS: Number(formData.get("probeIntervalS") ?? 60),
    probeTimeoutMs: Number(formData.get("probeTimeoutMs") ?? 5000),
  });
  revalidatePath("/settings/general");
  revalidatePath("/", "layout");
  redirect("/settings/general?saved=1");
}
