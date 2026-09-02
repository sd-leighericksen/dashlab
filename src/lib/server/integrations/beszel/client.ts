import "server-only";
import { fetch } from "undici";
import { secrets } from "@/lib/server/secrets";
import { IntegrationError } from "../types";

type Auth = { token: string; exp: number };
const g = globalThis as { __dashlabBeszelAuth?: Auth };

function decodeExp(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function authenticate(signal: AbortSignal): Promise<string> {
  const { url, email, password, token } = secrets.beszel;
  if (token) {
    g.__dashlabBeszelAuth = { token, exp: decodeExp(token) || Date.now() + 3600_000 };
    return token;
  }
  const res = await fetch(`${url}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
    signal,
  });
  if (res.status === 400 || res.status === 401)
    throw new IntegrationError("auth_failed", "beszel: invalid credentials");
  if (!res.ok) throw new IntegrationError("upstream_error", `beszel auth ${res.status}`);
  const data = (await res.json()) as { token: string };
  g.__dashlabBeszelAuth = { token: data.token, exp: decodeExp(data.token) || Date.now() + 5 * 864e5 };
  return data.token;
}

async function getToken(signal: AbortSignal): Promise<string> {
  const auth = g.__dashlabBeszelAuth;
  if (auth && auth.exp - Date.now() > 24 * 3600_000) return auth.token;
  return authenticate(signal);
}

export async function beszelGet<T>(pathAndQuery: string, signal: AbortSignal): Promise<T> {
  const { url } = secrets.beszel;
  if (!url) throw new IntegrationError("unconfigured", "beszel not configured");
  let token = await getToken(signal);
  const call = (t: string) =>
    fetch(`${url}${pathAndQuery}`, { headers: { authorization: t }, signal });
  let res = await call(token);
  if (res.status === 401) {
    token = await authenticate(signal);
    res = await call(token);
  }
  if (res.status === 401 || res.status === 403)
    throw new IntegrationError("auth_failed", `beszel ${res.status}`);
  if (!res.ok) throw new IntegrationError("upstream_error", `beszel ${res.status}`);
  return (await res.json()) as T;
}
