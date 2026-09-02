import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  char,
  customType,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contentKind } from "./enums";

export type ContentError = {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
};

export type TocEntry = { depth: number; id: string; text: string };

const tsvector = customType<{ data: string; notNull: false; default: false }>({
  dataType() {
    return "tsvector";
  },
});

export const contentIndex = pgTable(
  "content_index",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: contentKind().notNull(),
    slug: text().notNull(),
    path: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: text(),
    categorySlug: text(),
    serverSlug: text(),
    tags: text().array().notNull().default([]),
    frontmatter: jsonb().notNull().default({}),
    bodyMd: text(),
    bodyHtml: text(),
    toc: jsonb().$type<TocEntry[]>().default([]),
    hash: char({ length: 64 }).notNull(),
    size: integer(),
    mtime: timestamp({ withTimezone: true, mode: "date" }),
    valid: boolean().notNull().default(true),
    errors: jsonb().$type<ContentError[]>().notNull().default([]),
    indexedAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
    search: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(body_md,''))`,
    ),
  },
  (t) => [
    uniqueIndex("content_index_path_uk").on(t.path),
    uniqueIndex("content_index_kind_slug_uk").on(t.kind, t.slug),
    index("content_index_category_idx").on(t.categorySlug),
    index("content_index_server_idx").on(t.serverSlug),
    index("content_index_valid_idx").on(t.valid),
    index("content_index_tags_idx").using("gin", t.tags),
    index("content_index_search_idx").using("gin", t.search),
  ],
);

export type ContentRow = typeof contentIndex.$inferSelect;
export type NewContentRow = typeof contentIndex.$inferInsert;
