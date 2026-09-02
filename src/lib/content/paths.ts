import "server-only";
import path from "node:path";
import { getEnv } from "@/lib/env";
import { KIND_DIR, type ContentKindT } from "./kinds";
import { slugRe } from "./schemas/common";

export function contentRoot(): string {
  return path.resolve(getEnv().CONTENT_DIR);
}

export function kindDir(kind: ContentKindT): string {
  return path.join(contentRoot(), KIND_DIR[kind]);
}

export function filePath(kind: ContentKindT, slug: string): string {
  return path.join(kindDir(kind), `${slug}.md`);
}

export function relPath(kind: ContentKindT, slug: string): string {
  return `${KIND_DIR[kind]}/${slug}.md`;
}

/** Guard: resolved path must live inside CONTENT_DIR. */
export function assertInsideContent(p: string): void {
  const root = contentRoot();
  const resolved = path.resolve(p);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`path escapes content dir: ${p}`);
  }
}

export function isValidSlug(s: string): boolean {
  return slugRe.test(s) && s.length <= 64;
}
