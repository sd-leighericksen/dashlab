CREATE TYPE "public"."layout_mode" AS ENUM('list', 'cards');--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "layout" "layout_mode" DEFAULT 'list' NOT NULL;