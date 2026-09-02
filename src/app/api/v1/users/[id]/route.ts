import { withApi, json, readJson } from "@/lib/api/http";
import { setUserRole, setUserDisabled } from "@/lib/users";
import type { Role } from "@/lib/auth/roles";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withApi({ role: "superuser" }, async ({ req, actor, params }) => {
  const b = await readJson<{ role?: Role; disabled?: boolean }>(req);
  if (b.role) await setUserRole(params.id, b.role);
  if (typeof b.disabled === "boolean") await setUserDisabled(params.id, b.disabled);
  await audit(actor, "update_user", params.id, b);
  return json({ ok: true });
});
