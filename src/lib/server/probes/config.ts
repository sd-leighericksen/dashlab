import "server-only";
import type { ContentKindT } from "@/lib/content/kinds";

export type HttpTarget = {
  mode: "http";
  url: string;
  method: "GET" | "HEAD";
  expect: string;
  expectBody?: string;
  timeoutMs: number;
  intervalS: number;
  insecure: boolean;
  headers?: Record<string, string>;
};
export type TcpTarget = {
  mode: "tcp";
  host: string;
  port: number;
  timeoutMs: number;
  intervalS: number;
};
export type ProbeTarget = HttpTarget | TcpTarget | null;

type Fm = Record<string, unknown>;

function hostFromUrl(u: string): string | null {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}
function portFromUrl(u: string): number | null {
  try {
    const url = new URL(u);
    if (url.port) return Number(url.port);
    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

export function resolveProbe(
  kind: ContentKindT,
  fm: Fm,
  defaults: { intervalS: number; timeoutMs: number },
): ProbeTarget {
  const probe = fm.probe as Fm | undefined;
  if (probe && probe.enabled === false) return null;
  const urls = (fm.urls as Record<string, string> | undefined) ?? {};
  const type = (probe?.type as string) ?? (kind === "server" ? "tcp" : "http");
  const intervalS = (probe?.interval_s as number) ?? defaults.intervalS;
  const timeoutMs = (probe?.timeout_ms as number) ?? defaults.timeoutMs;

  if (type === "tcp") {
    const hostSel = (probe?.host as string) ?? (kind === "server" ? "internal" : "local");
    const ips = (fm.ips as Record<string, string> | undefined) ?? {};
    let host: string | null = null;
    if (hostSel === "internal") host = ips.internal ?? null;
    else if (hostSel === "hostname") host = (fm.hostname as string) ?? null;
    else host = hostFromUrl(urls[hostSel] ?? "");
    if (!host && urls.local) host = hostFromUrl(urls.local);
    if (!host) host = (fm.hostname as string) ?? ips.internal ?? null;
    if (!host) return null;
    const ssh = fm.ssh as Fm | undefined;
    const port =
      (probe?.port as number) ??
      (fm.port as number) ??
      (ssh?.port as number) ??
      22;
    return { mode: "tcp", host, port, timeoutMs, intervalS };
  }

  // http
  const targetSel = (probe?.target as string) ?? "local";
  let base: string | undefined;
  if (targetSel === "url") base = probe?.url as string | undefined;
  else base = urls[targetSel] ?? urls.local ?? urls.domain ?? urls.tailscale;
  if (!base) return null;
  const path = (probe?.path as string) ?? "/";
  let url: string;
  try {
    url = new URL(path, base).toString();
  } catch {
    return null;
  }
  return {
    mode: "http",
    url,
    method: (probe?.method as "GET" | "HEAD") ?? "HEAD",
    expect: (probe?.expect_status as string) ?? "200-399,401,403",
    expectBody: probe?.expect_body as string | undefined,
    timeoutMs,
    intervalS,
    insecure: (probe?.insecure_tls as boolean) ?? false,
    headers: probe?.headers as Record<string, string> | undefined,
  };
}

export function matchStatus(code: number, spec: string): boolean {
  for (const part of spec.split(",")) {
    const [lo, hi] = part.split("-").map((n) => Number(n.trim()));
    if (hi === undefined) {
      if (code === lo) return true;
    } else if (code >= lo && code <= hi) return true;
  }
  return false;
}
