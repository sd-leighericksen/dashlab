import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    keyHash: text().notNull(), // sha256(full key)
    keyPrefix: text().notNull(), // first 8 chars after dl_
    scopes: text().array().notNull().default(["read", "write"]),
    lastUsedAt: timestamp({ withTimezone: true, mode: "date" }),
    expiresAt: timestamp({ withTimezone: true, mode: "date" }),
    revokedAt: timestamp({ withTimezone: true, mode: "date" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("api_keys_hash_uk").on(t.keyHash),
    index("api_keys_user_idx").on(t.userId),
  ],
);

export type ApiKey = typeof apiKeys.$inferSelect;
