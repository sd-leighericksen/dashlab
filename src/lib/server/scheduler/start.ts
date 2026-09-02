import "server-only";
import { getEnv } from "@/lib/env";
import { startProbeScheduler } from "@/lib/server/probes/scheduler";
import { startIntegrationRunner } from "@/lib/server/integrations/runner";

export function startScheduler(): void {
  if (getEnv().DASHLAB_SCHEDULER === "off") return;
  startProbeScheduler();
  void startIntegrationRunner();
}
