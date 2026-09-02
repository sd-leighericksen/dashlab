import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { parseDocument } from "yaml";
import { filePath, kindDir, relPath, assertInsideContent, isValidSlug } from "./paths";
import { reindex } from "./indexer";
import { db } from "@/lib/db/client";
import { contentIndex, dashboardItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { contentRoot } from "./paths";
import type { ContentKindT } from "./kinds";
import { KIND_DIR } from "./kinds";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export class WriteConflictError extends Error {
  constructor(public currentHash: string, public currentRaw: string) {
    super("WRITE_CONFLICT");
  }
}
export class PreconditionRequiredError extends Error {
  constructor() {
    super("PRECONDITION_REQUIRED");
  }
}
export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}
export class AlreadyExistsError extends Error {
  constructor() {
    super("ALREADY_EXISTS");
  }
}

async function readRaw(kind: ContentKindT, slug: string): Promise<{ raw: string; hash: string } | null> {
  try {
    const raw = await fs.readFile(filePath(kind, slug), "utf8");
    return { raw, hash: sha256(raw) };
  } catch {
    return null;
  }
}

async function atomicWrite(kind: ContentKindT, slug: string, text: string): Promise<void> {
  const dir = kindDir(kind);
  await fs.mkdir(dir, { recursive: true });
  const target = filePath(kind, slug);
  assertInsideContent(target);
  const tmp = path.join(dir, `.${slug}.md.tmp-${randomBytes(4).toString("hex")}`);
  await fs.writeFile(tmp, text, { mode: 0o664 });
  try {
    await fs.rename(tmp, target);
  } catch (e) {
    await fs.unlink(tmp).catch(() => {});
    throw e;
  }
}

export type WriteOpts = {
  baseHash?: string; // optimistic concurrency
  force?: boolean; // ignore validation errors
  requireExisting?: boolean;
  requireAbsent?: boolean;
};

/** Write full raw file (frontmatter + body). Returns the new hash + index result. */
export async function writeRaw(
  kind: ContentKindT,
  slug: string,
  raw: string,
  opts: WriteOpts = {},
): Promise<{ hash: string }> {
  if (!isValidSlug(slug)) throw new Error("invalid slug");
  const current = await readRaw(kind, slug);
  if (opts.requireAbsent && current) throw new AlreadyExistsError();
  if (opts.requireExisting && !current) throw new NotFoundError();
  if (current) {
    if (opts.baseHash === undefined && !opts.force && !opts.requireAbsent) {
      throw new PreconditionRequiredError();
    }
    if (opts.baseHash && opts.baseHash !== current.hash && !opts.force) {
      throw new WriteConflictError(current.hash, current.raw);
    }
  }
  const text = raw.endsWith("\n") ? raw : raw + "\n";
  await atomicWrite(kind, slug, text);
  await reindex(kind, slug);
  return { hash: sha256(text) };
}

/** Compose raw markdown from structured frontmatter + body, preserving comments on update. */
export function composeRaw(
  frontmatter: Record<string, unknown>,
  body: string,
  existingRaw?: string,
): string {
  let fmText: string;
  if (existingRaw) {
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(existingRaw.replace(/\r\n/g, "\n"));
    const doc = parseDocument(m ? m[1] : "");
    for (const [k, v] of Object.entries(frontmatter)) {
      if (v === undefined || v === null) doc.delete(k);
      else doc.set(k, v);
    }
    fmText = String(doc).trimEnd();
  } else {
    const doc = parseDocument("");
    for (const [k, v] of Object.entries(frontmatter)) {
      if (v !== undefined && v !== null) doc.set(k, v);
    }
    fmText = String(doc).trimEnd();
  }
  return `---\n${fmText}\n---\n\n${body.replace(/^\n+/, "")}`;
}

export async function deleteToTrash(kind: ContentKindT, slug: string): Promise<string> {
  const src = filePath(kind, slug);
  const trashDir = path.join(contentRoot(), ".trash", KIND_DIR[kind]);
  await fs.mkdir(trashDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(trashDir, `${slug}.${ts}.md`);
  await fs.rename(src, dest);
  await db.delete(contentIndex).where(eq(contentIndex.path, relPath(kind, slug)));
  return dest;
}

export async function renameContent(
  kind: ContentKindT,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (!isValidSlug(newSlug)) throw new Error("invalid slug");
  const dest = filePath(kind, newSlug);
  assertInsideContent(dest);
  try {
    await fs.access(dest);
    throw new AlreadyExistsError();
  } catch (e) {
    if (e instanceof AlreadyExistsError) throw e;
  }
  await fs.rename(filePath(kind, oldSlug), dest);
  await db.delete(contentIndex).where(eq(contentIndex.path, relPath(kind, oldSlug)));
  await db
    .update(dashboardItems)
    .set({ slug: newSlug })
    .where(and(eq(dashboardItems.kind, kind), eq(dashboardItems.slug, oldSlug)));
  await reindex(kind, newSlug);
}
