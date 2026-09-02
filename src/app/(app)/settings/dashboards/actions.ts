"use server";
import { revalidatePath } from "next/cache";
import type { ContentKindT } from "@/lib/content/kinds";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { isHexColor } from "@/lib/theme";
import {
  createDashboard,
  updateDashboard,
  regenerateSlug,
  setDefaultDashboard,
  deleteDashboard,
  setDashboardCategories,
  setDashboardWidgets,
  setDashboardUsers,
  setDashboardItems,
} from "@/lib/dashboards/mutations";

const nullable = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

export async function newDashboard(formData: FormData): Promise<void> {
  const actor = await requirePage("admin");
  const name = String(formData.get("name") ?? "").trim() || "New Dashboard";
  const d = await createDashboard({ name, ownerId: actor.user.id });
  revalidatePath("/settings/dashboards");
  redirect(`/settings/dashboards/${d.id}`);
}

export async function saveDashboard(formData: FormData): Promise<void> {
  await requirePage("admin");
  const id = String(formData.get("id"));
  const accent = nullable(formData.get("accent"));
  if (accent && !isHexColor(accent)) redirect(`/settings/dashboards/${id}?error=accent+must+be+hex`);

  await updateDashboard(id, {
    name: String(formData.get("name") ?? "").trim() || "Dashboard",
    theme: (nullable(formData.get("theme")) as "light" | "dark" | null) ?? null,
    accent,
    bannerText: nullable(formData.get("bannerText")),
    bannerFont: nullable(formData.get("bannerFont")),
    addressType: (nullable(formData.get("addressType")) as "domain" | "tailscale" | "local" | null) ?? null,
    layout: (String(formData.get("layout") ?? "list") as "list" | "cards"),
    isPublic: formData.get("isPublic") === "on",
    kiosk: formData.get("kiosk") === "on",
    publicShowsPrivateAddresses: formData.get("publicShowsPrivateAddresses") === "on",
    refreshSeconds: Number(formData.get("refreshSeconds") ?? 60),
    scale: String(formData.get("scale") ?? "1"),
    showDetailPages: formData.get("showDetailPages") === "on",
    showWidgets: formData.get("showWidgets") === "on",
    showExternal: formData.get("showExternal") === "on",
    showServers: formData.get("showServers") === "on",
    showStatus: formData.get("showStatus") === "on",
    showPorts: formData.get("showPorts") === "on",
    showServer: formData.get("showServer") === "on",
    showUptime: formData.get("showUptime") === "on",
    showFilters: formData.get("showFilters") === "on",
  });

  const catSlugs = formData.getAll("cat").map(String);
  const allSlugs = new Set(formData.getAll("cat_all").map(String));
  await setDashboardCategories(id, catSlugs.map((slug) => ({ slug, includeAll: allSlugs.has(slug) })));

  // curated items: for categories with include-all OFF, collect checked items ("kind:slug")
  const curated: { kind: ContentKindT; slug: string; categorySlug?: string }[] = [];
  for (const slug of catSlugs) {
    if (allSlugs.has(slug)) continue;
    for (const raw of formData.getAll(`item:${slug}`).map(String)) {
      const [kind, itemSlug] = raw.split(":");
      if (kind && itemSlug) curated.push({ kind: kind as ContentKindT, slug: itemSlug, categorySlug: slug });
    }
  }
  await setDashboardItems(id, curated);

  await setDashboardWidgets(id, formData.getAll("widget").map(String));

  const userIds = formData.getAll("user").map(String);
  const editIds = new Set(formData.getAll("canedit").map(String));
  await setDashboardUsers(id, userIds.map((userId) => ({ userId, canEdit: editIds.has(userId) })));

  revalidatePath(`/settings/dashboards/${id}`);
  revalidatePath("/settings/dashboards");
  redirect(`/settings/dashboards/${id}?saved=1`);
}

export async function regenSlug(formData: FormData): Promise<void> {
  await requirePage("admin");
  const id = String(formData.get("id"));
  await regenerateSlug(id);
  revalidatePath(`/settings/dashboards/${id}`);
  redirect(`/settings/dashboards/${id}?saved=1`);
}
export async function makeDefault(formData: FormData): Promise<void> {
  await requirePage("admin");
  await setDefaultDashboard(String(formData.get("id")));
  revalidatePath("/settings/dashboards");
  redirect("/settings/dashboards?saved=1");
}
export async function removeDashboard(formData: FormData): Promise<void> {
  await requirePage("superuser");
  await deleteDashboard(String(formData.get("id")));
  revalidatePath("/settings/dashboards");
  redirect("/settings/dashboards?saved=1");
}
