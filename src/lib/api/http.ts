import "server-only";
import { randomUUID } from "node:crypto";
import { getActor, type Actor } from "@/lib/auth/actor";
import { roleAtLeast } from "@/lib/auth/roles";
import { checkSameOrigin } from "@/lib/auth/csrf";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { DomainError, err } from "./errors";
import { problemResponse } from "./problem";

export type ApiCtx = {
  req: Request;
  url: URL;
  actor: Actor | null;
  requestId: string;
  params: Record<string, string>;
};

type Options = {
  auth?: "required" | "optional";
  role?: "admin" | "superuser";
  rateKind?: "read" | "write";
};

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
  });
}

export async function readJson<T = unknown>(req: Request, maxBytes = 1_000_000): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json"))
    throw new DomainError("unsupported_media_type", "expected application/json");
  const text = await req.text();
  if (text.length > maxBytes) throw err.tooLarge();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw err.badRequest("invalid JSON body");
  }
}

export async function readText(req: Request, maxBytes = 512_000): Promise<string> {
  const text = await req.text();
  if (text.length > maxBytes) throw err.tooLarge();
  return text;
}

function clientIp(req: Request): string {
  if (getEnv().TRUST_PROXY) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
  }
  return "local";
}

export function withApi(
  opts: Options,
  handler: (ctx: ApiCtx) => Promise<Response>,
) {
  return async (
    req: Request,
    context: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const requestId = randomUUID();
    const url = new URL(req.url);
    const started = Date.now();
    let actor: Actor | null = null;
    try {
      actor = await getActor();
      if ((opts.auth ?? "required") === "required" && !actor) throw err.unauthorized();
      if (opts.role && (!actor || !roleAtLeast(actor.role, opts.role)))
        throw err.forbidden(opts.role);

      // CSRF for cookie-authenticated unsafe requests
      if (actor?.via === "session" && !SAFE.has(req.method) && !checkSameOrigin(req))
        throw err.forbidden("cross-origin request blocked");

      // rate limit
      const isWrite = !SAFE.has(req.method);
      const rlKey = actor?.via === "api_key"
        ? `api:key:${actor.user.id}`
        : actor
          ? `api:user:${actor.user.id}`
          : `api:ip:${clientIp(req)}`;
      const limit = isWrite ? 60 : 600;
      const rl = rateLimit(`${rlKey}:${isWrite ? "w" : "r"}`, limit, 60_000);
      if (!rl.ok) throw err.rateLimited(rl.retryAfter);

      const params = await context.params;
      const res = await handler({ req, url, actor, requestId, params });
      res.headers.set("x-request-id", requestId);
      logger.info(
        {
          requestId,
          method: req.method,
          path: url.pathname,
          status: res.status,
          durationMs: Date.now() - started,
          actor: actor ? { via: actor.via, role: actor.role } : null,
        },
        "api",
      );
      return res;
    } catch (e) {
      const res = problemResponse(e, requestId, getEnv().PUBLIC_URL);
      if (!(e instanceof DomainError))
        logger.error({ requestId, err: e, path: url.pathname }, "api error");
      return res;
    }
  };
}
