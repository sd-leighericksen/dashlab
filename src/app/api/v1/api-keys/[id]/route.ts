import { withApi } from "@/lib/api/http";
import { revokeApiKey } from "@/lib/auth/api-keys";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = withApi({ role: "superuser" }, async ({ actor, params }) => {
  await revokeApiKey(params.id);
  await audit(actor, "revoke_api_key", params.id);
  return new Response(null, { status: 204 });
});
