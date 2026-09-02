import { randomBytes, randomInt } from "node:crypto";

/** URL-safe base64 without padding. */
export function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** A high-entropy opaque token (default 32 bytes -> 43 char base64url). */
export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** API key: `dl_` + 32 random bytes. Shown once. */
export function newApiKey(): string {
  return `dl_${randomToken(32)}`;
}

// Dashboard slug: 8 chars, ambiguity-free alphabet (no 0/o/1/l/i).
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function dashboardSlug(len = 8): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }
  return out;
}

/** Six-digit style setup code, grouped for readability: e.g. "4F2K-9QX7". */
export function setupCode(): string {
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => alpha[randomInt(alpha.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
}

/** kebab-case slug from an arbitrary title. */
export function slugify(input: string, max = 64): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}
