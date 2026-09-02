import type { ContentKindT } from "./kinds";

export type Field = { key: string; type: string; req?: boolean; note?: string };
export type FieldSection = { title: string; fields: Field[] };

const COMMON: FieldSection = {
  title: "common (all kinds)",
  fields: [
    { key: "name", type: "text", req: true, note: "display name" },
    { key: "description", type: "text", note: "one-line summary" },
    { key: "category", type: "slug", note: "category slug (e.g. media)" },
    { key: "tags", type: "list", note: "[tag1, tag2]" },
    { key: "icon", type: "text", note: "emoji, or first-letter fallback" },
    { key: "card_url", type: "url", note: "URL opened in Card mode" },
    { key: "open_in", type: "new_tab | same_tab | overlay" },
    { key: "hidden", type: "bool", note: "hide from dashboards" },
    { key: "links", type: "list", note: "[{ label, url }]" },
  ],
};

const PROBE: FieldSection = {
  title: "probe (optional)",
  fields: [
    { key: "probe.enabled", type: "bool" },
    { key: "probe.type", type: "http | tcp" },
    { key: "probe.target", type: "domain | tailscale | local | url", note: "http: which URL to hit" },
    { key: "probe.host", type: "internal | tailscale | domain | hostname", note: "tcp: which host" },
    { key: "probe.url", type: "url", note: "when target: url" },
    { key: "probe.method", type: "GET | HEAD" },
    { key: "probe.path", type: "text", note: "e.g. /health" },
    { key: "probe.port", type: "int", note: "tcp port" },
    { key: "probe.expect_status", type: "text", note: 'e.g. "200-399,401"' },
    { key: "probe.timeout_ms", type: "int" },
    { key: "probe.interval_s", type: "int", note: "min 15" },
    { key: "probe.insecure_tls", type: "bool", note: "accept self-signed" },
  ],
};

const SERVICE: FieldSection[] = [
  {
    title: "service",
    fields: [
      { key: "status", type: "running | stopped | paused | planned | deprecated | broken" },
      { key: "server", type: "slug", note: "links to a server record" },
      { key: "urls.domain", type: "url" },
      { key: "urls.tailscale", type: "url" },
      { key: "urls.local", type: "url", note: "at least one url unless status: planned" },
      { key: "port", type: "int" },
      { key: "install.method", type: "docker | compose | native | script | vm | lxc | k8s | other" },
      { key: "install.directory", type: "text" },
      { key: "install.image", type: "text" },
      { key: "install.container", type: "text" },
      { key: "install.autostart", type: "bool" },
      { key: "monitors.beszel", type: "text", note: "Beszel system name/id" },
      { key: "monitors.uptime_kuma", type: "int | text" },
    ],
  },
  PROBE,
];

const SERVER: FieldSection[] = [
  {
    title: "server",
    fields: [
      { key: "status", type: "active | offline | maintenance | retired | planned" },
      { key: "hostname", type: "text" },
      { key: "ips.internal", type: "ipv4" },
      { key: "ips.tailscale", type: "ipv4" },
      { key: "ssh.port", type: "int" },
      { key: "ssh.user", type: "text" },
      { key: "hardware.brand", type: "text" },
      { key: "hardware.model", type: "text" },
      { key: "hardware.cpu", type: "text" },
      { key: "hardware.ram_gb", type: "number" },
      { key: "hardware.storage", type: "text" },
      { key: "os", type: "text" },
      { key: "location", type: "text" },
      { key: "purpose", type: "text" },
      { key: "tech_stack", type: "text" },
      { key: "urls.local", type: "url", note: "optional management UI" },
      { key: "monitors.beszel_system", type: "text", note: "Beszel system name/id → cpu/mem/disk/temp" },
    ],
  },
  PROBE,
];

const EXTERNAL: FieldSection[] = [
  {
    title: "external service",
    fields: [
      { key: "type", type: "saas | api | hosting | domain | dns | cdn | backup | ai | other" },
      { key: "provider", type: "text" },
      { key: "status", type: "active | trial | testing | paused | cancelled" },
      { key: "url", type: "url" },
      { key: "docs_url", type: "url" },
      { key: "billing.monthly_cost", type: "number" },
      { key: "billing.currency", type: "text", note: "3-letter, e.g. AUD" },
      { key: "billing.cycle", type: "monthly | yearly | usage | free" },
      { key: "billing.renews_on", type: "date", note: "YYYY-MM-DD" },
      { key: "purpose", type: "text" },
    ],
  },
];

const BOOKMARK: FieldSection[] = [
  {
    title: "bookmark",
    fields: [
      { key: "url", type: "url", req: true, note: "the link this bookmark opens" },
    ],
  },
];

export function fieldReference(kind: ContentKindT): FieldSection[] {
  const specific = kind === "service" ? SERVICE : kind === "server" ? SERVER : kind === "bookmark" ? BOOKMARK : EXTERNAL;
  return [COMMON, ...specific];
}
