import "server-only";
import { readFileSync } from "node:fs";

function fileEnv(key: string): string | undefined {
  const filePath = process.env[`${key}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, "utf8").trim();
    } catch {
      return undefined;
    }
  }
  const v = process.env[key];
  return v && v.length ? v : undefined;
}

export type IntegrationId = "beszel" | "uptime_kuma" | "openrouter";

export type BeszelSecrets = { url?: string; email?: string; password?: string; token?: string };
export type UptimeKumaSecrets = { url?: string; statusSlug?: string; apiKey?: string };
export type OpenRouterSecrets = { managementKey?: string; apiKey?: string };
export type SecretsBundle = {
  beszel: BeszelSecrets;
  uptime_kuma: UptimeKumaSecrets;
  openrouter: OpenRouterSecrets;
};

// DB-backed values, loaded at boot and after each save. Env always wins.
const g = globalThis as { __dashlabDbSecrets?: Partial<SecretsBundle> };
g.__dashlabDbSecrets ??= {};

function db<T>(id: IntegrationId): Partial<T> {
  return (g.__dashlabDbSecrets![id] as Partial<T>) ?? {};
}
const pick = (envVal: string | undefined, dbVal: string | undefined) => envVal ?? dbVal;

export const secrets = {
  beszel: {
    get url() { return pick(fileEnv("BESZEL_URL"), db<BeszelSecrets>("beszel").url); },
    get email() { return pick(fileEnv("BESZEL_EMAIL"), db<BeszelSecrets>("beszel").email); },
    get password() { return pick(fileEnv("BESZEL_PASSWORD"), db<BeszelSecrets>("beszel").password); },
    get token() { return pick(fileEnv("BESZEL_TOKEN"), db<BeszelSecrets>("beszel").token); },
    get configured() { return !!(this.url && ((this.email && this.password) || this.token)); },
    get source() { return fileEnv("BESZEL_URL") ? "env" : db<BeszelSecrets>("beszel").url ? "db" : "none"; },
  },
  uptimeKuma: {
    get url() { return pick(fileEnv("UPTIME_KUMA_URL"), db<UptimeKumaSecrets>("uptime_kuma").url); },
    get statusSlug() { return pick(fileEnv("UPTIME_KUMA_STATUS_SLUG"), db<UptimeKumaSecrets>("uptime_kuma").statusSlug); },
    get apiKey() { return pick(fileEnv("UPTIME_KUMA_API_KEY"), db<UptimeKumaSecrets>("uptime_kuma").apiKey); },
    get configured() { return !!(this.url && this.statusSlug); },
    get source() { return fileEnv("UPTIME_KUMA_URL") ? "env" : db<UptimeKumaSecrets>("uptime_kuma").url ? "db" : "none"; },
  },
  openrouter: {
    get managementKey() { return pick(fileEnv("OPENROUTER_MANAGEMENT_KEY") ?? fileEnv("OPENROUTER_PROVISIONING_KEY"), db<OpenRouterSecrets>("openrouter").managementKey); },
    get apiKey() { return pick(fileEnv("OPENROUTER_API_KEY"), db<OpenRouterSecrets>("openrouter").apiKey); },
    get configured() { return !!this.managementKey; },
    get source() { return (fileEnv("OPENROUTER_MANAGEMENT_KEY") ?? fileEnv("OPENROUTER_PROVISIONING_KEY")) ? "env" : db<OpenRouterSecrets>("openrouter").managementKey ? "db" : "none"; },
  },
};

/** Load DB-stored (encrypted) integration secrets into the in-memory cache. */
export async function loadDbSecrets(): Promise<void> {
  const { db: database } = await import("@/lib/db/client");
  const { integrations } = await import("@/lib/db/schema");
  const { decryptSecret } = await import("@/lib/crypto/secrets");
  const rows = await database.select().from(integrations);
  const next: Partial<SecretsBundle> = {};
  for (const row of rows) {
    if (!row.secretsEnc) continue;
    try {
      const buf = Buffer.isBuffer(row.secretsEnc) ? row.secretsEnc : Buffer.from(row.secretsEnc as unknown as Uint8Array);
      const parsed = JSON.parse(decryptSecret(buf));
      (next as Record<string, unknown>)[row.id] = parsed;
    } catch {
      /* wrong key / corrupt: ignore */
    }
  }
  g.__dashlabDbSecrets = next;
}

/** Persist one integration's secrets (encrypted) and refresh the cache. */
export async function saveDbSecrets(
  id: IntegrationId,
  fields: Record<string, string | undefined>,
): Promise<void> {
  const { db: database } = await import("@/lib/db/client");
  const { integrations } = await import("@/lib/db/schema");
  const { encryptSecret } = await import("@/lib/crypto/secrets");
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v != null && v !== ""),
  );
  const enabled = Object.keys(clean).length > 0;
  const blob = enabled ? encryptSecret(JSON.stringify(clean)) : null;
  await database
    .insert(integrations)
    .values({ id, enabled, secretsEnc: blob, updatedAt: new Date() })
    .onConflictDoUpdate({ target: integrations.id, set: { enabled, secretsEnc: blob, updatedAt: new Date() } });
  await loadDbSecrets();
}

/** Read current (merged) values for pre-filling the settings form. Secrets masked. */
export function currentSecretsForForm() {
  return {
    beszel: { url: secrets.beszel.url ?? "", email: secrets.beszel.email ?? "", hasPassword: !!secrets.beszel.password, source: secrets.beszel.source },
    uptime_kuma: { url: secrets.uptimeKuma.url ?? "", statusSlug: secrets.uptimeKuma.statusSlug ?? "", hasApiKey: !!secrets.uptimeKuma.apiKey, source: secrets.uptimeKuma.source },
    openrouter: { hasManagementKey: !!secrets.openrouter.managementKey, source: secrets.openrouter.source },
  };
}

export function dbSecretsRaw(id: IntegrationId): Record<string, string> {
  return { ...((g.__dashlabDbSecrets![id] as Record<string, string>) ?? {}) };
}
