import "server-only";
import { hash, verify } from "@node-rs/argon2";
import type { Algorithm } from "@node-rs/argon2";

// Argon2id === 2 in @node-rs/argon2 (const enum, inaccessible under isolatedModules).
const ARGON2ID = 2 as Algorithm;

const OPTS = {
  algorithm: ARGON2ID,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(phc: string, plain: string): Promise<boolean> {
  try {
    return await verify(phc, plain, OPTS);
  } catch {
    return false;
  }
}

const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
export async function dummyVerify(): Promise<void> {
  try {
    await verify(DUMMY_HASH, "not-a-real-password", OPTS);
  } catch {
    /* ignore */
  }
}

export function validatePasswordStrength(password: string, username: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (password.length > 128) return "Password must be at most 128 characters";
  if (password.toLowerCase() === username.toLowerCase())
    return "Password must not equal the username";
  return null;
}
