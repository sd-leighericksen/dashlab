import type { AddressType } from "./types";

export type AddressOption = {
  type: AddressType;
  url: string;
  label: "dom" | "ts" | "lan";
};

const LABEL: Record<AddressType, "dom" | "ts" | "lan"> = {
  domain: "dom",
  tailscale: "ts",
  local: "lan",
};

export type UrlSet = { domain?: string; tailscale?: string; local?: string };

export function appAddresses(
  urls: UrlSet | undefined,
  preferred: AddressType = "domain",
): AddressOption[] {
  if (!urls) return [];
  const order: AddressType[] = [preferred, "domain", "tailscale", "local"].filter(
    (v, i, a) => a.indexOf(v) === i,
  ) as AddressType[];
  const out: AddressOption[] = [];
  for (const t of order) {
    const url = urls[t];
    if (url) out.push({ type: t, url, label: LABEL[t] });
  }
  return out;
}

export function preferredAddress(
  urls: UrlSet | undefined,
  preferred: AddressType = "domain",
): AddressOption | null {
  return appAddresses(urls, preferred)[0] ?? null;
}
