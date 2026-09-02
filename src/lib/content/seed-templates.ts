import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { contentRoot } from "./paths";
import { TEMPLATES } from "./templates";
import { logger } from "@/lib/logger";

export async function seedTemplates(): Promise<void> {
  const dir = path.join(contentRoot(), "_templates");
  await fs.mkdir(dir, { recursive: true });
  for (const [kind, body] of Object.entries(TEMPLATES)) {
    const f = path.join(dir, `${kind}.md`);
    try {
      await fs.access(f);
    } catch {
      await fs.writeFile(f, body, { mode: 0o664 });
      logger.debug({ kind }, "seeded template");
    }
  }
}
