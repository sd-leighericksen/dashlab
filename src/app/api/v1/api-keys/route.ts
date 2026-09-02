import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { listApiKeys, issueApiKey } from "@/lib/auth/api-keys";
import { audit } from "@/lib/api/audit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi({ role: "superuser" }, async () => {
  const keys = await listApiKeys();
  return json({
    items: keys.map((k) => ({
      id: k.id, name: k.name, prefix: k.keyPrefix, userId: k.userId,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      revoked: !!k.revokedAt, createdAt: k.createdAt.toISOString(),
    })),
  });
});

export const POST = withApi({ role: "superuser" }, async ({ req, actor }) => {
  const b = await readJson<{ userId: string; name: string; expiresAt?: string }>(req);
  if (!b.userId || !b.name) throw err.badRequest("userId and name required");
  const key = await issueApiKey(b.userId, b.name, b.expiresAt ? new Date(b.expiresAt) : undefined);
  await audit(actor, "issue_api_key", b.name, { userId: b.userId });
  return json({ id: key.id, prefix: key.prefix, key: key.key }, { status: 201 });
});
