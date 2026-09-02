import "server-only";
import { scanAll } from "./indexer";
import { seedTemplates } from "./seed-templates";
import { startWatcher } from "./watcher";
import { logger } from "@/lib/logger";

export async function startContentPipeline(): Promise<void> {
  await seedTemplates();
  await scanAll();
  startWatcher();
  logger.info("content pipeline started");
}
