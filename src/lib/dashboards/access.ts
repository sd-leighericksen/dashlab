import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dashboardUsers, type Dashboard } from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/actor";
import {
  canViewDashboard as canView,
  canEditDashboard as canEdit,
} from "@/lib/auth/authorize";

export async function membershipFor(
  actor: Actor | null,
  dashboardId: string,
): Promise<{ canEdit: boolean } | null> {
  if (!actor) return null;
  const row = await db.query.dashboardUsers.findFirst({
    where: and(
      eq(dashboardUsers.dashboardId, dashboardId),
      eq(dashboardUsers.userId, actor.user.id),
    ),
  });
  return row ? { canEdit: row.canEdit } : null;
}

export async function canViewDashboard(
  actor: Actor | null,
  dash: Dashboard,
): Promise<boolean> {
  const m = await membershipFor(actor, dash.id);
  return canView(actor, dash, m);
}

export async function canEditDashboard(
  actor: Actor | null,
  dash: Dashboard,
): Promise<boolean> {
  const m = await membershipFor(actor, dash.id);
  return canEdit(actor, dash, m);
}
