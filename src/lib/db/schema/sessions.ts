import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(), // sha256(cookie token)
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    ip: text(),
    userAgent: text(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
