import "server-only";
import type { Job } from "./types";
import { beszelJobs } from "./beszel/integration";
import { uptimeKumaJobs } from "./uptime-kuma/integration";
import { openrouterJobs } from "./openrouter/integration";

export function getJobs(): Job[] {
  return [...beszelJobs(), ...uptimeKumaJobs(), ...openrouterJobs()];
}
