import "server-only";
import {
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { getEnv } from "@/lib/env";

/** SHA-256 hex of a string (used for session ids and API key lookups). */
export function sha256hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time compare of two hex strings of equal length. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function deriveKey(purpose: string): Buffer {
  const { DASHLAB_SECRET } = getEnv();
  // HKDF-SHA256 -> 32-byte subkey per purpose.
  return Buffer.from(
    hkdfSync("sha256", DASHLAB_SECRET, Buffer.alloc(0), purpose, 32),
  );
}

/** HMAC-SHA256 hex for signing (e.g. setup cookie). */
export function hmac(purpose: string, value: string): string {
  return createHmac("sha256", deriveKey(`hmac:${purpose}`))
    .update(value)
    .digest("hex");
}

/**
 * AES-256-GCM encrypt to `iv(12) || ciphertext || tag(16)` bytes.
 * Reserved for DB-stored integration secrets (backlog UI); env wins in v1.
 */
export function encryptSecret(plaintext: string, purpose = "integrations"): Buffer {
  const key = deriveKey(`enc:${purpose}`);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

export function decryptSecret(blob: Buffer, purpose = "integrations"): string {
  const key = deriveKey(`enc:${purpose}`);
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(12, blob.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
