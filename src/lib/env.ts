import "server-only";
import { z } from "zod";
import { readFileSync } from "node:fs";

/**
 * Reads an env var, transparently supporting the Docker `*_FILE` convention:
 * if `FOO_FILE` is set, its file contents (trimmed) are used for `FOO`.
 */
function fromEnv(key: string): string | undefined {
  const filePath = process.env[`${key}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, "utf8").trim();
    } catch {
      return undefined;
    }
  }
  return process.env[key];
}

const raw = {
  DATABASE_URL: fromEnv("DATABASE_URL"),
  DASHLAB_SECRET: fromEnv("DASHLAB_SECRET"),
  PUBLIC_URL: process.env.PUBLIC_URL,
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? "auto",
  TRUST_PROXY: process.env.TRUST_PROXY ?? "false",
  CONTENT_DIR: process.env.CONTENT_DIR ?? "./data/content",
  ICONS_DIR: process.env.ICONS_DIR ?? "./data/icons",
  CONTENT_WATCH_POLL: process.env.CONTENT_WATCH_POLL ?? "false",
  CONTENT_RESCAN_INTERVAL_S: process.env.CONTENT_RESCAN_INTERVAL_S ?? "600",
  PROBE_INTERVAL_S: process.env.PROBE_INTERVAL_S ?? "60",
  PROBE_TIMEOUT_MS: process.env.PROBE_TIMEOUT_MS ?? "5000",
  PROBE_CONCURRENCY: process.env.PROBE_CONCURRENCY ?? "6",
  PROBE_RETENTION_DAYS: process.env.PROBE_RETENTION_DAYS ?? "7",
  DASHLAB_SETUP_USERNAME: process.env.DASHLAB_SETUP_USERNAME,
  DASHLAB_SETUP_PASSWORD: fromEnv("DASHLAB_SETUP_PASSWORD"),
  DASHLAB_SCHEDULER: process.env.DASHLAB_SCHEDULER ?? "inproc",
  DASHLAB_CORS_ORIGINS: process.env.DASHLAB_CORS_ORIGINS ?? "",
  DASHLAB_HSTS: process.env.DASHLAB_HSTS ?? "0",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  TZ: process.env.TZ ?? "UTC",
};

const boolish = z
  .string()
  .transform((v) => v === "true" || v === "1" || v === "yes")
  .pipe(z.boolean());

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .describe("Postgres connection string"),
  DASHLAB_SECRET: z
    .string()
    .min(32, "DASHLAB_SECRET must be at least 32 characters"),
  PUBLIC_URL: z.url().optional(),
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).default("auto"),
  TRUST_PROXY: boolish.default(false),
  CONTENT_DIR: z.string().min(1),
  ICONS_DIR: z.string().min(1),
  CONTENT_WATCH_POLL: boolish.default(false),
  CONTENT_RESCAN_INTERVAL_S: z.coerce.number().int().min(30).default(600),
  PROBE_INTERVAL_S: z.coerce.number().int().min(15).default(60),
  PROBE_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(5000),
  PROBE_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(6),
  PROBE_RETENTION_DAYS: z.coerce.number().int().min(1).max(400).default(7),
  DASHLAB_SETUP_USERNAME: z.string().optional(),
  DASHLAB_SETUP_PASSWORD: z.string().optional(),
  DASHLAB_SCHEDULER: z.enum(["inproc", "off"]).default("inproc"),
  DASHLAB_CORS_ORIGINS: z.string().default(""),
  DASHLAB_HSTS: z.enum(["0", "1"]).default("0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  TZ: z.string().default("UTC"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function cookieSecure(env = getEnv()): boolean {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return env.PUBLIC_URL?.startsWith("https://") ?? false;
}

export function corsOrigins(env = getEnv()): string[] {
  return env.DASHLAB_CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
