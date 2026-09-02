import {
  pgTable,
  bigserial,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    at: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorVia: text(), // session | api_key | system
    action: text().notNull(),
    target: text(),
    beforeHash: text(),
    afterHash: text(),
    meta: jsonb().notNull().default({}),
  },
  (t) => [index("audit_log_at_idx").on(t.at.desc())],
);

export type AuditEntry = typeof auditLog.$inferSelect;
