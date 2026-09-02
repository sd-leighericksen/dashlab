import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { buildServer } from "@/lib/mcp/server";
import { verifyApiKey } from "@/lib/auth/api-keys";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const base = createMcpHandler((server) => buildServer(server), {
  serverInfo: { name: "dashlab", version: "1.0.0" },
});

const handler = withMcpAuth(
  base,
  async (_req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
    if (!bearer) return undefined;
    const verified = await verifyApiKey(bearer);
    if (!verified) return undefined;
    return {
      token: bearer,
      clientId: verified.apiKey.id,
      scopes: verified.scopes,
      extra: { userId: verified.user.id, role: verified.user.role, keyId: verified.apiKey.id },
    };
  },
  { required: true },
);

// DNS-rebinding guard: reject cross-host Origins when PUBLIC_URL is set.
function guard(req: Request): Response | null {
  const publicUrl = getEnv().PUBLIC_URL;
  if (!publicUrl) return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    if (new URL(origin).host !== new URL(publicUrl).host) {
      return new Response("forbidden origin", { status: 403 });
    }
  } catch {
    return new Response("bad origin", { status: 400 });
  }
  return null;
}

async function route(req: Request): Promise<Response> {
  const blocked = guard(req);
  if (blocked) return blocked;
  return handler(req);
}

export { route as GET, route as POST, route as DELETE };
