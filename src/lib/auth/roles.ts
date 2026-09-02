// Pure role/scope helpers — safe to import anywhere (no server-only deps).
export type Role = "superuser" | "admin" | "user";
export type Scope =
  | "content:read"
  | "content:write"
  | "dashboards:read"
  | "dashboards:write"
  | "users:admin"
  | "integrations:admin"
  | "stats:read"
  | "probes:check";

const RANK: Record<Role, number> = { user: 1, admin: 2, superuser: 3 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export function scopesForRole(role: Role): Scope[] {
  const base: Scope[] = ["content:read", "dashboards:read", "stats:read"];
  if (role === "admin" || role === "superuser") {
    base.push(
      "content:write",
      "dashboards:write",
      "probes:check",
    );
  }
  if (role === "superuser") {
    base.push("users:admin", "integrations:admin");
  }
  return base;
}
