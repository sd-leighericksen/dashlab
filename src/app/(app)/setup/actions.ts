"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSetupComplete, verifySetupCode, clearSetupCode } from "@/lib/auth/setup";
import { completeSetup } from "@/lib/db/seed";
import { validatePasswordStrength } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie, requestMeta } from "@/lib/auth/cookies";
import { rateLimit } from "@/lib/auth/rate-limit";

export async function completeSetupAction(formData: FormData): Promise<void> {
  if (await isSetupComplete()) redirect("/login");
  const meta = await requestMeta();
  const rl = rateLimit(`setup:${meta.ip ?? "local"}`, 10, 15 * 60_000);
  if (!rl.ok) redirect("/setup?error=Too+many+attempts");

  const code = String(formData.get("code") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const homelabName = String(formData.get("homelabName") ?? "").trim();

  if (!verifySetupCode(code)) redirect("/setup?error=Invalid+setup+code");
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/i.test(username))
    redirect("/setup?error=Invalid+username");
  const pwErr = validatePasswordStrength(password, username);
  if (pwErr) redirect(`/setup?error=${encodeURIComponent(pwErr)}`);

  const { userId } = await completeSetup({
    username,
    password,
    displayName: displayName || undefined,
    homelabName: homelabName || undefined,
  });
  clearSetupCode();
  const { token, expiresAt } = await createSession(userId, meta);
  await setSessionCookie(token, expiresAt);

  const def = await db.query.dashboards.findFirst({
    where: eq(dashboards.isDefault, true),
  });
  redirect(def ? `/d/${def.slug}` : "/settings/dashboards");
}
