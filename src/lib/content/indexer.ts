import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contentIndex, categories } from "@/lib/db/schema";
import type { ContentError, TocEntry } from "@/lib/db/schema/content";
import { CONTENT_KINDS, DIR_KIND, KIND_DIR, type ContentKindT } from "./kinds";
import { contentRoot, kindDir, relPath, isValidSlug } from "./paths";
import { parseContent } from "./frontmatter";
import { renderMarkdown } from "./render";
import { enqueue } from "./queue";
import { bus } from "@/lib/events/bus";
import { logger } from "@/lib/logger";

function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

const IGNORE_RE = /(^|\/)\.|~$|\.(tmp|swp)$/;

export function isIgnored(name: string): boolean {
  return IGNORE_RE.test(name) || !name.endsWith(".md");
}

type IndexInput = { kind: ContentKindT; slug: string; rel: string };

function kindSlugFromRel(rel: string): IndexInput | null {
  const parts = rel.split("/");
  if (parts.length !== 2) return null;
  const kind = DIR_KIND[parts[0]];
  if (!kind) return null;
  const slug = parts[1].replace(/\.md$/, "");
  return { kind, slug, rel };
}

async function referenceWarnings(
  kind: ContentKindT,
  fm: Record<string, unknown>,
): Promise<ContentError[]> {
  const out: ContentError[] = [];
  const cat = fm.category as string | undefined;
  if (cat) {
    const c = await db.query.categories.findFirst({ where: eq(categories.slug, cat) });
    if (!c) out.push({ severity: "info", path: "category", message: `unknown category "${cat}"` });
  }
  if (kind === "service" && typeof fm.server === "string") {
    const srv = await db.query.contentIndex.findFirst({
      where: and(eq(contentIndex.kind, "server"), eq(contentIndex.slug, fm.server as string)),
    });
    if (!srv) out.push({ severity: "warning", path: "server", message: `unknown server "${fm.server}"` });
  }
  return out;
}

async function doIndexFile(input: IndexInput): Promise<void> {
  const { kind, slug, rel } = input;
  const abs = path.join(contentRoot(), rel);
  let raw: string;
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(abs);
    raw = await fs.readFile(abs, "utf8");
  } catch {
    await doRemove(kind, slug);
    return;
  }

  const hash = sha256(raw);
  const existing = await db.query.contentIndex.findFirst({
    where: eq(contentIndex.path, rel),
  });
  if (existing && existing.hash === hash) return; // unchanged (also dedupes our own writes)

  const errors: ContentError[] = [];
  if (!isValidSlug(slug)) {
    errors.push({ severity: "error", path: "(filename)", message: "filename must be kebab-case" });
  }

  const parsed = parseContent(raw, kind);
  errors.push(...parsed.errors);
  errors.push(...(await referenceWarnings(kind, parsed.frontmatter)));

  let bodyHtml = "";
  let toc: TocEntry[] = [];
  try {
    const r = await renderMarkdown(parsed.body);
    bodyHtml = r.html;
    toc = r.toc;
  } catch (e) {
    errors.push({ severity: "warning", path: "(body)", message: `render failed: ${(e as Error).message}` });
  }

  const fm = parsed.frontmatter;
  const valid = parsed.valid && isValidSlug(slug) && !errors.some((e) => e.severity === "error");

  const row = {
    kind,
    slug,
    path: rel,
    name: (typeof fm.name === "string" && fm.name) || slug,
    description: (fm.description as string) ?? null,
    status: (fm.status as string) ?? null,
    categorySlug: (fm.category as string) ?? null,
    serverSlug: kind === "service" ? ((fm.server as string) ?? null) : null,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    frontmatter: fm,
    bodyMd: parsed.body,
    bodyHtml,
    toc,
    hash,
    size: stat.size,
    mtime: stat.mtime,
    valid,
    errors,
    indexedAt: new Date(),
  };

  await db
    .insert(contentIndex)
    .values(row)
    .onConflictDoUpdate({ target: contentIndex.path, set: row });

  bus.emitEvent("content:changed", { kind, slug, path: rel, valid });
}

async function doRemove(kind: ContentKindT, slug: string): Promise<void> {
  const rel = relPath(kind, slug);
  await db.delete(contentIndex).where(eq(contentIndex.path, rel));
  bus.emitEvent("content:removed", { kind, slug, path: rel });
}

/** Public: (re)index a single file by its relative path, serialized. */
export function reindexPath(rel: string): Promise<void> {
  const input = kindSlugFromRel(rel);
  if (!input) return Promise.resolve();
  return enqueue(() => doIndexFile(input));
}

export function removePath(rel: string): Promise<void> {
  const input = kindSlugFromRel(rel);
  if (!input) return Promise.resolve();
  return enqueue(() => doRemove(input.kind, input.slug));
}

export function reindex(kind: ContentKindT, slug: string): Promise<void> {
  return enqueue(() => doIndexFile({ kind, slug, rel: relPath(kind, slug) }));
}

/** Full scan: index new/changed files, delete rows whose file is gone. */
export async function scanAll(): Promise<number> {
  await fs.mkdir(contentRoot(), { recursive: true });
  const seen = new Set<string>();
  for (const kind of ["server","service","external"] as const) {
    const dir = kindDir(kind);
    await fs.mkdir(dir, { recursive: true });
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (isIgnored(name)) continue;
      const rel = `${KIND_DIR[kind]}/${name}`;
      seen.add(rel);
      await enqueue(() => doIndexFile({ kind, slug: name.replace(/\.md$/, ""), rel }));
    }
  }
  // delete rows for files that no longer exist
  const rows = await db.select({ path: contentIndex.path }).from(contentIndex);
  const gone = rows.map((r) => r.path).filter((p) => !seen.has(p));
  if (gone.length) {
    await db.delete(contentIndex).where(inArray(contentIndex.path, gone));
  }
  const count = seen.size;
  bus.emitEvent("index:rescan", { count });
  logger.info({ count, removed: gone.length }, "content scan complete");
  return count;
}
