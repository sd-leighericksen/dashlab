import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/actor";

export async function audit(
  actor: Actor | null,
  action: string,
  target?: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await db
    .insert(auditLog)
    .values({
      actorUserId: actor?.user.id ?? null,
      actorVia: actor?.via ?? "system",
      action,
      target: target ?? null,
      meta,
    })
    .catch(() => {});
}
