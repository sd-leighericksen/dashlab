import "server-only";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contentIndex, type ContentRow } from "@/lib/db/schema";
import type { ContentKindT } from "./kinds";
import { filePath } from "./paths";
import { parseContent } from "./frontmatter";
import { renderMarkdown } from "./render";

export type ListFilter = {
  category?: string;
  server?: string;
  status?: string;
  q?: string;
  tag?: string;
  includeHidden?: boolean;
};

export async function listContent(
  kind: ContentKindT,
  filter: ListFilter = {},
): Promise<ContentRow[]> {
  const rows = await db
    .select()
    .from(contentIndex)
    .where(eq(contentIndex.kind, kind))
    .orderBy(asc(contentIndex.name));
  return rows.filter((r) => {
    if (!filter.includeHidden && (r.frontmatter as { hidden?: boolean })?.hidden) return false;
    if (filter.category && r.categorySlug !== filter.category) return false;
    if (filter.server && r.serverSlug !== filter.server) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.tag && !r.tags.includes(filter.tag)) return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      const hay = `${r.name} ${r.description ?? ""} ${r.tags.join(" ")} ${r.serverSlug ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function listAll(filter: ListFilter = {}): Promise<ContentRow[]> {
  const kinds: ContentKindT[] = ["service", "server", "external"];
  const all = await Promise.all(kinds.map((k) => listContent(k, filter)));
  return all.flat();
}

export async function getContent(
  kind: ContentKindT,
  slug: string,
): Promise<ContentRow | null> {
  const row = await db.query.contentIndex.findFirst({
    where: and(eq(contentIndex.kind, kind), eq(contentIndex.slug, slug)),
  });
  return row ?? null;
}

export async function servicesForServer(serverSlug: string): Promise<ContentRow[]> {
  return db
    .select()
    .from(contentIndex)
    .where(and(eq(contentIndex.kind, "service"), eq(contentIndex.serverSlug, serverSlug)))
    .orderBy(asc(contentIndex.name));
}

export async function getRaw(
  kind: ContentKindT,
  slug: string,
): Promise<{ raw: string; hash: string } | null> {
  try {
    const raw = await fs.readFile(filePath(kind, slug), "utf8");
    return { raw, hash: createHash("sha256").update(raw).digest("hex") };
  } catch {
    return null;
  }
}

export async function validateRaw(
  kind: ContentKindT,
  raw: string,
  render = false,
): Promise<{ ok: boolean; errors: ReturnType<typeof parseContent>["errors"]; normalized: Record<string, unknown>; html?: string }> {
  const parsed = parseContent(raw, kind);
  let html: string | undefined;
  if (render) {
    try {
      html = (await renderMarkdown(parsed.body)).html;
    } catch {
      html = undefined;
    }
  }
  return { ok: parsed.valid, errors: parsed.errors, normalized: parsed.frontmatter, html };
}

export async function lintSummary(): Promise<{ errors: number; warnings: number; rows: ContentRow[] }> {
  const rows = await db
    .select()
    .from(contentIndex)
    .orderBy(desc(contentIndex.indexedAt));
  let errors = 0;
  let warnings = 0;
  const problem: ContentRow[] = [];
  for (const r of rows) {
    const errs = (r.errors ?? []).filter((e) => e.severity === "error").length;
    const warns = (r.errors ?? []).filter((e) => e.severity !== "error").length;
    errors += errs;
    warnings += warns;
    if (errs || warns) problem.push(r);
  }
  return { errors, warnings, rows: problem };
}
