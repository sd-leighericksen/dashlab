import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: serial().primaryKey(),
    slug: text().notNull(),
    name: text().notNull(),
    glyph: text(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_uk").on(t.slug)],
);

export type Category = typeof categories.$inferSelect;
