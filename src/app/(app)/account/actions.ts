"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/actor";
import { verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { changeOwnPassword } from "@/lib/users";

export async function changePasswordAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const ok = await verifyPassword(actor.user.passwordHash, current);
  if (!ok) redirect("/account?error=current+password+incorrect");
  const err = validatePasswordStrength(next, actor.user.username);
  if (err) redirect(`/account?error=${encodeURIComponent(err)}`);
  await changeOwnPassword(actor.user.id, next);
  revalidatePath("/account");
  redirect("/account?saved=1");
}
