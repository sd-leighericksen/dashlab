import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/actor";
import { isSetupComplete } from "@/lib/auth/setup";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isSetupComplete())) redirect("/setup");
  const actor = await getActor();
  if (!actor) redirect("/login");
  const def = await db.query.dashboards.findFirst({
    where: eq(dashboards.isDefault, true),
  });
  if (def) redirect(`/d/${def.slug}`);
  redirect("/settings/dashboards");
}
