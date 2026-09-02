"use server";
import { revalidatePath } from "next/cache";
import { requirePage } from "@/lib/auth/guard";
import { issueApiKey, revokeApiKey } from "@/lib/auth/api-keys";
import { audit } from "@/lib/api/audit";

export type IssueState = { key?: string; prefix?: string; name?: string; error?: string };

export async function issueKeyAction(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const actor = await requirePage("superuser");
  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!userId || !name) return { error: "user and name required" };
  const k = await issueApiKey(userId, name);
  await audit(actor, "issue_api_key", name, { userId });
  revalidatePath("/settings/api-keys");
  return { key: k.key, prefix: k.prefix, name };
}

export async function revokeKeyAction(formData: FormData): Promise<void> {
  const actor = await requirePage("superuser");
  await revokeApiKey(String(formData.get("id")));
  await audit(actor, "revoke_api_key", String(formData.get("id")));
  revalidatePath("/settings/api-keys");
}
