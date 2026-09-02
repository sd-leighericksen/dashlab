import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { listUsers, createUser } from "@/lib/users";
import { validatePasswordStrength } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/roles";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ role: "superuser" }, async () => {
  const users = await listUsers();
  return json({
    items: users.map((u) => ({
      id: u.id, username: u.username, displayName: u.displayName, role: u.role,
      disabled: !!u.disabledAt, createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  });
});

export const POST = withApi({ role: "superuser" }, async ({ req, actor }) => {
  const b = await readJson<{ username: string; password: string; displayName?: string; role?: Role }>(req);
  const username = (b.username ?? "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) throw err.badRequest("invalid username");
  const pwErr = validatePasswordStrength(b.password ?? "", username);
  if (pwErr) throw err.badRequest(pwErr);
  await createUser({ username, password: b.password, displayName: b.displayName, role: b.role ?? "user", mustChangePassword: true });
  await audit(actor, "create_user", username);
  return json({ username }, { status: 201 });
});
