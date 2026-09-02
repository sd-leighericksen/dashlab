import "server-only";
import type { IntegrationId } from "@/lib/server/secrets";

export type SnapshotStatus =
  | "ok"
  | "unconfigured"
  | "unreachable"
  | "auth_failed"
  | "upstream_error"
  | "stale";

export class IntegrationError extends Error {
  constructor(
    public code: Exclude<SnapshotStatus, "ok" | "stale">,
    message: string,
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}

export type Job = {
  integration: IntegrationId;
  key: string;
  intervalMs: number;
  timeoutMs: number;
  configured: () => boolean;
  run: (signal: AbortSignal) => Promise<unknown>;
};
