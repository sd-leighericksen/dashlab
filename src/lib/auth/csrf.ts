import "server-only";
import { getEnv } from "@/lib/env";

/**
 * For cookie-authenticated unsafe REST requests: require a same-origin signal.
 * Bearer-authenticated requests are exempt (no ambient credential).
 */
export function checkSameOrigin(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  const origin = req.headers.get("origin");
  if (!origin) return false;
  const { PUBLIC_URL } = getEnv();
  try {
    const originHost = new URL(origin).host;
    const reqHost = new URL(req.url).host;
    if (originHost === reqHost) return true;
    if (PUBLIC_URL && originHost === new URL(PUBLIC_URL).host) return true;
  } catch {
    return false;
  }
  return false;
}
