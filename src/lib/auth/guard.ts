import "server-only";
import { redirect } from "next/navigation";
import { getActor, type Actor } from "./actor";
import { roleAtLeast } from "./roles";

export async function requirePage(
  min?: "admin" | "superuser",
  next = "/settings",
): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (min && !roleAtLeast(actor.role, min)) redirect("/");
  return actor;
}
