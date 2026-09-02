import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { destroyUserSessions } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.username));
}

export async function createUser(input: {
  username: string;
  password: string;
  displayName?: string;
  role: Role;
  mustChangePassword?: boolean;
}): Promise<void> {
  await db.insert(users).values({
    username: input.username.toLowerCase(),
    displayName: input.displayName ?? input.username,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    mustChangePassword: input.mustChangePassword ?? true,
  });
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function setUserDisabled(id: string, disabled: boolean): Promise<void> {
  await db
    .update(users)
    .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, id));
  if (disabled) await destroyUserSessions(id);
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  mustChange = true,
): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: mustChange,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
  await destroyUserSessions(id);
}

export async function changeOwnPassword(id: string, newPassword: string): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}
