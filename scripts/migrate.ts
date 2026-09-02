import { waitForDb, runMigrations } from "../src/lib/db/migrate";
import { getPool } from "../src/lib/db/client";

async function main() {
  await waitForDb();
  await runMigrations();
  await getPool().end();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
