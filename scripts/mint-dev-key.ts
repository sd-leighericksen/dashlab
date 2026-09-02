import { eq } from "drizzle-orm";
import { db, getPool } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { issueApiKey } from "../src/lib/auth/api-keys";
async function main() {
  const u = await db.query.users.findFirst({ where: eq(users.username, "leigh") });
  if (!u) { console.error("no leigh"); process.exit(1); }
  const k = await issueApiKey(u.id, "dev-cli-key");
  console.log(k.key);
  await getPool().end();
}
main();
