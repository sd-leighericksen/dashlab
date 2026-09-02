import type { ContentRow, ProbeState } from "@/lib/db/schema";
import type { ContentKindT } from "@/lib/content/kinds";

const KIND_PLURAL: Record<ContentKindT, string> = {
  service: "services",
  server: "servers",
  external: "external-services",
  bookmark: "bookmarks",
};

export function apiPath(kind: ContentKindT, slug: string): string {
  return `/api/v1/${KIND_PLURAL[kind]}/${slug}`;
}

export function serializeContent(
  row: ContentRow,
  probe: ProbeState | null,
  opts: { body?: boolean; html?: boolean } = {},
): Record<string, unknown> {
  const fm = row.frontmatter as Record<string, unknown>;
  const out: Record<string, unknown> = {
    type: row.kind,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.categorySlug,
    tags: row.tags,
    frontmatter: fm,
    file: {
      path: row.path,
      hash: `sha256:${row.hash}`,
      modifiedAt: row.mtime?.toISOString() ?? null,
    },
    valid: row.valid,
    validation: { ok: row.valid, issues: row.errors ?? [] },
    status: probe
      ? {
          state: probe.state,
          uptime24h: probe.uptime24h,
          uptime7d: probe.uptime7d,
          latencyMs: probe.lastLatencyMs,
          lastCheckedAt: probe.lastCheckedAt?.toISOString() ?? null,
        }
      : null,
    updatedAt: row.indexedAt?.toISOString() ?? null,
  };
  if (row.kind === "service") out.server = row.serverSlug;
  if (opts.body) out.body = row.bodyMd;
  if (opts.html) out.bodyHtml = row.bodyHtml;
  return out;
}
