import "server-only";
import { fetch, Agent } from "undici";
import type { HttpTarget } from "./config";
import { matchStatus } from "./config";

const g = globalThis as { __dashlabAgents?: { strict: Agent; insecure: Agent } };

function agents() {
  if (!g.__dashlabAgents) {
    g.__dashlabAgents = {
      strict: new Agent({ connect: { timeout: 3000 } }),
      insecure: new Agent({ connect: { timeout: 3000, rejectUnauthorized: false } }),
    };
  }
  return g.__dashlabAgents;
}

export type ProbeOutcome = {
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
  kind: "http" | "tcp";
};

export async function probeHttp(t: HttpTarget): Promise<ProbeOutcome> {
  const start = Date.now();
  const dispatcher = t.insecure ? agents().insecure : agents().strict;
  const doFetch = (method: "GET" | "HEAD") =>
    fetch(t.url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(t.timeoutMs),
      headers: { "user-agent": "dashlab-probe/1", ...(t.headers ?? {}) },
      dispatcher,
    });
  try {
    let res = await doFetch(t.method);
    if (t.method === "HEAD" && [400, 405, 501].includes(res.status)) {
      res = await doFetch("GET");
    }
    const latencyMs = Date.now() - start;
    let ok = matchStatus(res.status, t.expect);
    if (ok && t.expectBody) {
      const body = await res.text();
      ok = body.slice(0, 65536).includes(t.expectBody);
    } else {
      res.body?.cancel().catch(() => {});
    }
    return { ok, status: res.status, latencyMs, kind: "http" };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: (e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message,
      kind: "http",
    };
  }
}
