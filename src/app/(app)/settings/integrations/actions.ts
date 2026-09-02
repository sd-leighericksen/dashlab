"use server";
import { revalidatePath } from "next/cache";
import { requirePage } from "@/lib/auth/guard";
import { saveDbSecrets, dbSecretsRaw, type IntegrationId } from "@/lib/server/secrets";
import { refreshIntegration } from "@/lib/server/integrations/runner";
import { audit } from "@/lib/api/audit";

// blank secret field = keep existing; blank non-secret = clear.
function merge(id: IntegrationId, submitted: Record<string, string | undefined>, secretKeys: string[]): Record<string, string | undefined> {
  const existing = dbSecretsRaw(id);
  const out: Record<string, string | undefined> = { ...existing };
  for (const [k, v] of Object.entries(submitted)) {
    const val = (v ?? "").trim();
    if (secretKeys.includes(k)) {
      if (val) out[k] = val; // keep existing when blank
    } else {
      out[k] = val || undefined;
    }
  }
  return out;
}

export async function saveBeszel(formData: FormData): Promise<void> {
  const actor = await requirePage("superuser");
  const fields = merge("beszel", {
    url: String(formData.get("url") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  }, ["password"]);
  await saveDbSecrets("beszel", fields);
  refreshIntegration("beszel");
  await audit(actor, "save_integration", "beszel");
  revalidatePath("/settings/integrations");
}

export async function saveUptimeKuma(formData: FormData): Promise<void> {
  const actor = await requirePage("superuser");
  const fields = merge("uptime_kuma", {
    url: String(formData.get("url") ?? ""),
    statusSlug: String(formData.get("statusSlug") ?? ""),
    apiKey: String(formData.get("apiKey") ?? ""),
  }, ["apiKey"]);
  await saveDbSecrets("uptime_kuma", fields);
  refreshIntegration("uptime_kuma");
  await audit(actor, "save_integration", "uptime_kuma");
  revalidatePath("/settings/integrations");
}

export async function saveOpenRouter(formData: FormData): Promise<void> {
  const actor = await requirePage("superuser");
  const fields = merge("openrouter", {
    managementKey: String(formData.get("managementKey") ?? ""),
    apiKey: String(formData.get("apiKey") ?? ""),
  }, ["managementKey", "apiKey"]);
  await saveDbSecrets("openrouter", fields);
  refreshIntegration("openrouter");
  await audit(actor, "save_integration", "openrouter");
  revalidatePath("/settings/integrations");
}

export async function clearIntegration(formData: FormData): Promise<void> {
  const actor = await requirePage("superuser");
  const id = String(formData.get("id")) as IntegrationId;
  await saveDbSecrets(id, {});
  refreshIntegration(id);
  await audit(actor, "clear_integration", id);
  revalidatePath("/settings/integrations");
}
