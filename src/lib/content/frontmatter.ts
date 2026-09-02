import "server-only";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { ContentError } from "@/lib/db/schema/content";
import { schemaFor } from "./schemas";
import type { ContentKindT } from "./kinds";

const SECRET_KEY_RE = /pass(word)?|secret|token|api[_-]?key|private[_-]?key/i;

export type ParsedFile = {
  frontmatter: Record<string, unknown>;
  body: string;
  errors: ContentError[];
  valid: boolean;
};

function splitFrontmatter(raw: string): { fm: string | null; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { fm: null, body: text };
  return { fm: m[1], body: text.slice(m[0].length) };
}

function stripNullDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNullDeep).filter((v) => v !== null && v !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || v === undefined) continue;
      out[k] = stripNullDeep(v);
    }
    return out;
  }
  return value;
}

function findSecretKeys(obj: unknown, prefix = ""): string[] {
  const hits: string[] = [];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (SECRET_KEY_RE.test(k)) hits.push(p);
      hits.push(...findSecretKeys(v, p));
    }
  }
  return hits;
}

export function parseContent(raw: string, kind: ContentKindT): ParsedFile {
  const errors: ContentError[] = [];
  const { fm, body } = splitFrontmatter(raw);

  let data: Record<string, unknown> = {};
  if (fm === null) {
    errors.push({ severity: "error", path: "", message: "missing YAML frontmatter (--- block)" });
    return { frontmatter: {}, body, errors, valid: false };
  }

  let yamlObj: unknown;
  try {
    yamlObj = parseYaml(fm, { schema: "core" });
  } catch (e) {
    errors.push({ severity: "error", path: "", message: `invalid YAML: ${(e as Error).message}` });
    return { frontmatter: {}, body, errors, valid: false };
  }
  if (yamlObj === null || typeof yamlObj !== "object" || Array.isArray(yamlObj)) {
    errors.push({ severity: "error", path: "", message: "frontmatter must be a mapping" });
    return { frontmatter: {}, body, errors, valid: false };
  }
  const rawObj = yamlObj as Record<string, unknown>;

  // secret keys -> hard errors
  for (const k of findSecretKeys(rawObj)) {
    errors.push({ severity: "error", path: k, message: "secrets do not belong in content files" });
  }

  // A blank YAML key ("server:") parses to null; optional zod fields reject null,
  // so treat null/undefined as "absent" before validating.
  const cleaned = stripNullDeep(rawObj) as Record<string, unknown>;

  const schema = schemaFor(kind);
  const result = schema.safeParse(cleaned);
  let valid = true;
  if (result.success) {
    data = result.data as Record<string, unknown>;
  } else {
    valid = false;
    for (const issue of (result.error as z.ZodError).issues) {
      errors.push({
        severity: "error",
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      });
    }
    data = cleaned; // keep parsed values so the page can still show something
  }

  if (errors.some((e) => e.severity === "error")) valid = false;
  return { frontmatter: data, body, errors, valid };
}
