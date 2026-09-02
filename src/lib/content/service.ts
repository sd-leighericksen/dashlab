import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { probeState, type ContentRow } from "@/lib/db/schema";
import type { ContentKindT } from "./kinds";
import { getContent, getRaw } from "./repo";
import { parseContent } from "./frontmatter";
import {
  writeRaw,
  composeRaw,
  deleteToTrash,
  renameContent,
  WriteConflictError,
  PreconditionRequiredError,
  NotFoundError,
  AlreadyExistsError,
} from "./writer";
import { isValidSlug } from "./paths";
import { slugify } from "@/lib/crypto/random";
import { err } from "@/lib/api/errors";

function mapWriteError(e: unknown): never {
  if (e instanceof WriteConflictError) throw err.etagMismatch(`sha256:${e.currentHash}`);
  if (e instanceof PreconditionRequiredError) throw err.preconditionRequired();
  if (e instanceof NotFoundError) throw err.notFound();
  if (e instanceof AlreadyExistsError) throw err.conflict("already exists");
  throw e;
}

export type CreateInput = {
  slug?: string;
  frontmatter: Record<string, unknown>;
  body?: string;
  ifNotExists?: boolean;
};

export async function createContent(
  kind: ContentKindT,
  input: CreateInput,
): Promise<ContentRow> {
  const name = (input.frontmatter.name as string) ?? input.slug ?? "";
  const slug = slugify(input.slug ?? name);
  if (!isValidSlug(slug)) throw err.badRequest("could not derive a valid slug");
  const existing = await getRaw(kind, slug);
  if (existing) {
    if (input.ifNotExists) {
      const row = await getContent(kind, slug);
      if (row) return row;
    }
    throw err.conflict("already exists", { existing: `/api/v1/${kind}s/${slug}` });
  }
  const raw = composeRaw(input.frontmatter, input.body ?? "");
  try {
    await writeRaw(kind, slug, raw, { requireAbsent: true });
  } catch (e) {
    mapWriteError(e);
  }
  const row = await getContent(kind, slug);
  if (!row) throw err.notFound();
  return row;
}

export async function updateFull(
  kind: ContentKindT,
  slug: string,
  input: { frontmatter: Record<string, unknown>; body: string },
  ifMatch: string | null,
  force = false,
): Promise<ContentRow> {
  const current = await getRaw(kind, slug);
  if (!current) throw err.notFound();
  if (!ifMatch && !force) throw err.preconditionRequired();
  const raw = composeRaw(input.frontmatter, input.body, current.raw);
  try {
    await writeRaw(kind, slug, raw, { baseHash: ifMatch ?? undefined, force, requireExisting: true });
  } catch (e) {
    mapWriteError(e);
  }
  const row = await getContent(kind, slug);
  if (!row) throw err.notFound();
  return row;
}

/** JSON Merge Patch on frontmatter (null deletes) + optional body replace. */
export async function patchContent(
  kind: ContentKindT,
  slug: string,
  input: { frontmatter?: Record<string, unknown> | null; body?: string },
  ifMatch: string | null,
  force = false,
): Promise<ContentRow> {
  const current = await getRaw(kind, slug);
  if (!current) throw err.notFound();
  if (!ifMatch && !force) throw err.preconditionRequired();
  const parsed = parseContent(current.raw, kind);
  const nextFm: Record<string, unknown> = { ...parsed.frontmatter };
  if (input.frontmatter) {
    for (const [k, v] of Object.entries(input.frontmatter)) {
      if (v === null) delete nextFm[k];
      else nextFm[k] = v;
    }
  }
  const nextBody = input.body ?? parsed.body;
  const raw = composeRaw(nextFm, nextBody, current.raw);
  try {
    await writeRaw(kind, slug, raw, { baseHash: ifMatch ?? undefined, force, requireExisting: true });
  } catch (e) {
    mapWriteError(e);
  }
  const row = await getContent(kind, slug);
  if (!row) throw err.notFound();
  return row;
}

export async function writeWholeRaw(
  kind: ContentKindT,
  slug: string,
  raw: string,
  ifMatch: string | null,
  force = false,
): Promise<{ hash: string }> {
  const current = await getRaw(kind, slug);
  if (!current) throw err.notFound();
  if (!ifMatch && !force) throw err.preconditionRequired();
  try {
    return await writeRaw(kind, slug, raw, { baseHash: ifMatch ?? undefined, force, requireExisting: true });
  } catch (e) {
    mapWriteError(e);
  }
}

export async function removeContent(
  kind: ContentKindT,
  slug: string,
): Promise<{ trashPath: string }> {
  const current = await getContent(kind, slug);
  if (!current) throw err.notFound();
  const trashPath = await deleteToTrash(kind, slug);
  return { trashPath };
}

export async function rename(
  kind: ContentKindT,
  slug: string,
  newSlug: string,
): Promise<ContentRow> {
  const clean = slugify(newSlug);
  if (!isValidSlug(clean)) throw err.badRequest("invalid new slug");
  try {
    await renameContent(kind, slug, clean);
  } catch (e) {
    mapWriteError(e);
  }
  const row = await getContent(kind, clean);
  if (!row) throw err.notFound();
  return row;
}

export async function probeFor(kind: ContentKindT, slug: string) {
  return (
    (await db.query.probeState.findFirst({
      where: and(eq(probeState.kind, kind), eq(probeState.slug, slug)),
    })) ?? null
  );
}
