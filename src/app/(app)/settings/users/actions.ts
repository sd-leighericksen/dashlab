"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { createUser, setUserRole, setUserDisabled, resetUserPassword } from "@/lib/users";
import { validatePasswordStrength } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/roles";

export async function addUser(formData: FormData): Promise<void> {
  await requirePage("superuser");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) redirect("/settings/users?error=invalid+username");
  const err = validatePasswordStrength(password, username);
  if (err) redirect(`/settings/users?error=${encodeURIComponent(err)}`);
  await createUser({
    username,
    password,
    displayName: String(formData.get("displayName") ?? "").trim() || undefined,
    role: (String(formData.get("role") ?? "user")) as Role,
    mustChangePassword: true,
  });
  revalidatePath("/settings/users");
  redirect("/settings/users?saved=1");
}
export async function changeRole(formData: FormData): Promise<void> {
  await requirePage("superuser");
  await setUserRole(String(formData.get("id")), String(formData.get("role")) as Role);
  revalidatePath("/settings/users");
}
export async function toggleDisabled(formData: FormData): Promise<void> {
  await requirePage("superuser");
  await setUserDisabled(String(formData.get("id")), formData.get("disabled") === "1");
  revalidatePath("/settings/users");
}
export async function resetPassword(formData: FormData): Promise<void> {
  await requirePage("superuser");
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 12) redirect("/settings/users?error=temp+password+too+short");
  await resetUserPassword(String(formData.get("id")), pw, true);
  revalidatePath("/settings/users");
  redirect("/settings/users?saved=1");
}
