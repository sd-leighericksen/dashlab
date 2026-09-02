import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { userRole } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    username: text().notNull(),
    displayName: text(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default("user"),
    mustChangePassword: boolean().notNull().default(false),
    disabledAt: timestamp({ withTimezone: true, mode: "date" }),
    lastLoginAt: timestamp({ withTimezone: true, mode: "date" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_username_uk").on(t.username)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
