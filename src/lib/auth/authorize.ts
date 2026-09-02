import "server-only";
import type { Actor } from "./actor";
import { roleAtLeast } from "./roles";
import type { Dashboard } from "@/lib/db/schema";

export class ForbiddenError extends Error {
  constructor(public requiredRole?: string) {
    super("FORBIDDEN");
  }
}

export function assertRole(
  actor: Actor,
  min: "admin" | "superuser",
): void {
  if (!roleAtLeast(actor.role, min)) throw new ForbiddenError(min);
}

export function canWriteContent(actor: Actor): boolean {
  return roleAtLeast(actor.role, "admin");
}

export function assertCanWriteContent(actor: Actor): void {
  if (!canWriteContent(actor)) throw new ForbiddenError("admin");
}

export type DashboardMembership = { canEdit: boolean } | null;

export function canViewDashboard(
  actor: Actor | null,
  dash: Pick<Dashboard, "isPublic" | "ownerId">,
  membership: DashboardMembership,
): boolean {
  if (dash.isPublic) return true;
  if (!actor) return false;
  if (roleAtLeast(actor.role, "admin")) return true;
  if (dash.ownerId === actor.user.id) return true;
  return membership != null;
}

export function canEditDashboard(
  actor: Actor | null,
  dash: Pick<Dashboard, "ownerId">,
  membership: DashboardMembership,
): boolean {
  if (!actor) return false;
  if (roleAtLeast(actor.role, "admin")) return true;
  if (dash.ownerId === actor.user.id) return true;
  return membership?.canEdit === true;
}
