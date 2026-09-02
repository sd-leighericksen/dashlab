import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { getEnv, cookieSecure } from "@/lib/env";
import { resolveSession, sessionCookieName } from "./session";
import { verifyApiKey } from "./api-keys";
import { scopesForRole, type Role, type Scope } from "./roles";

export type Actor = {
  user: User;
  via: "session" | "api_key";
  scopes: Scope[];
  role: Role;
};

/** Resolve the current actor from a Bearer API key or the session cookie. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const env = getEnv();
  const h = await headers();
  const authz = h.get("authorization");
  if (authz?.startsWith("Bearer ")) {
    const verified = await verifyApiKey(authz.slice(7).trim());
    if (verified)
      return {
        user: verified.user,
        via: "api_key",
        scopes: verified.scopes,
        role: verified.user.role,
      };
    return null; // an invalid bearer token is not silently downgraded to cookie
  }

  const jar = await cookies();
  const name = sessionCookieName(cookieSecure(env));
  const token = jar.get(name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(token);
  if (!resolved) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, resolved.session.userId),
  });
  if (!user || user.disabledAt) return null;
  return {
    user,
    via: "session",
    scopes: scopesForRole(user.role),
    role: user.role,
  };
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("UNAUTHENTICATED");
  return actor;
}
