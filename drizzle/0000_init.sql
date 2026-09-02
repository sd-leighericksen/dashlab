CREATE TYPE "public"."address_type" AS ENUM('domain', 'tailscale', 'local');--> statement-breakpoint
CREATE TYPE "public"."content_kind" AS ENUM('service', 'server', 'external');--> statement-breakpoint
CREATE TYPE "public"."open_mode" AS ENUM('new_tab', 'same_tab', 'overlay');--> statement-breakpoint
CREATE TYPE "public"."probe_status" AS ENUM('up', 'down', 'unknown', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('superuser', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"disabled_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" text[] DEFAULT '{"read","write"}' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"homelab_name" text DEFAULT 'Nimbus Cloud' NOT NULL,
	"banner_text" text,
	"banner_font" text DEFAULT 'ANSI Shadow' NOT NULL,
	"theme_default" "theme_mode" DEFAULT 'dark' NOT NULL,
	"accent_default" text DEFAULT '#f3b445' NOT NULL,
	"address_default" "address_type" DEFAULT 'domain' NOT NULL,
	"open_in_default" "open_mode" DEFAULT 'new_tab' NOT NULL,
	"probe_interval_s" integer DEFAULT 60 NOT NULL,
	"probe_timeout_ms" integer DEFAULT 5000 NOT NULL,
	"probe_concurrency" integer DEFAULT 6 NOT NULL,
	"probe_retention_days" integer DEFAULT 7 NOT NULL,
	"big_screen_scale" text DEFAULT '1' NOT NULL,
	"timezone" text DEFAULT 'Australia/Melbourne' NOT NULL,
	"setup_completed_at" timestamp with time zone,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"glyph" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_categories" (
	"dashboard_id" uuid NOT NULL,
	"category_slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"include_all" boolean DEFAULT true NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "dashboard_categories_dashboard_id_category_slug_pk" PRIMARY KEY("dashboard_id","category_slug")
);
--> statement-breakpoint
CREATE TABLE "dashboard_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"category_slug" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_users" (
	"dashboard_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_users_dashboard_id_user_id_pk" PRIMARY KEY("dashboard_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"size" text DEFAULT 'md' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"kiosk" boolean DEFAULT false NOT NULL,
	"refresh_seconds" integer DEFAULT 60 NOT NULL,
	"scale" text DEFAULT '1' NOT NULL,
	"public_shows_private_addresses" boolean DEFAULT false NOT NULL,
	"theme" "theme_mode",
	"accent" text,
	"banner_text" text,
	"banner_font" text,
	"address_type" "address_type",
	"open_in" "open_mode",
	"show_detail_pages" boolean DEFAULT true NOT NULL,
	"show_widgets" boolean DEFAULT true NOT NULL,
	"show_external" boolean DEFAULT true NOT NULL,
	"show_servers" boolean DEFAULT true NOT NULL,
	"show_status" boolean DEFAULT true NOT NULL,
	"show_ports" boolean DEFAULT true NOT NULL,
	"show_server" boolean DEFAULT true NOT NULL,
	"show_uptime" boolean DEFAULT true NOT NULL,
	"show_filters" boolean DEFAULT true NOT NULL,
	"columns" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text,
	"category_slug" text,
	"server_slug" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"frontmatter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_md" text,
	"body_html" text,
	"toc" jsonb DEFAULT '[]'::jsonb,
	"hash" char(64) NOT NULL,
	"size" integer,
	"mtime" timestamp with time zone,
	"valid" boolean DEFAULT true NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(body_md,''))) STORED
);
--> statement-breakpoint
CREATE TABLE "probe_hourly" (
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"ok_count" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer,
	"max_latency_ms" integer,
	CONSTRAINT "probe_hourly_kind_slug_hour_pk" PRIMARY KEY("kind","slug","hour")
);
--> statement-breakpoint
CREATE TABLE "probe_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"ok" boolean NOT NULL,
	"status" integer,
	"latency_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "probe_state" (
	"kind" "content_kind" NOT NULL,
	"slug" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"state" "probe_status" DEFAULT 'unknown' NOT NULL,
	"state_since" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"last_ok" boolean,
	"last_status" integer,
	"last_latency_ms" integer,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"uptime24h" numeric(5, 2),
	"uptime7d" numeric(5, 2),
	"next_due_at" timestamp with time zone,
	"target_url" text,
	"kind_label" text,
	CONSTRAINT "probe_state_kind_slug_pk" PRIMARY KEY("kind","slug")
);
--> statement-breakpoint
CREATE TABLE "integration_snapshots" (
	"integration" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb,
	"ok" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"error" text,
	"fetched_at" timestamp with time zone,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer,
	CONSTRAINT "integration_snapshots_integration_key_pk" PRIMARY KEY("integration","key")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secrets_enc" "bytea",
	"last_ok_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrouter_activity_daily" (
	"date" date NOT NULL,
	"model" text NOT NULL,
	"endpoint_id" text DEFAULT '' NOT NULL,
	"api_key_hash" text DEFAULT '' NOT NULL,
	"provider_name" text,
	"usage_usd" numeric(14, 6) DEFAULT '0' NOT NULL,
	"byok_usd" numeric(14, 6) DEFAULT '0' NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" bigint DEFAULT 0 NOT NULL,
	"completion_tokens" bigint DEFAULT 0 NOT NULL,
	"reasoning_tokens" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "openrouter_activity_daily_date_model_endpoint_id_api_key_hash_pk" PRIMARY KEY("date","model","endpoint_id","api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_via" text,
	"action" text NOT NULL,
	"target" text,
	"before_hash" text,
	"after_hash" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_categories" ADD CONSTRAINT "dashboard_categories_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_items" ADD CONSTRAINT "dashboard_items_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_users" ADD CONSTRAINT "dashboard_users_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_users" ADD CONSTRAINT "dashboard_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uk" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_uk" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uk" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_items_uk" ON "dashboard_items" USING btree ("dashboard_id","kind","slug");--> statement-breakpoint
CREATE INDEX "dashboard_items_order_idx" ON "dashboard_items" USING btree ("dashboard_id","category_slug","sort_order");--> statement-breakpoint
CREATE INDEX "dashboard_widgets_order_idx" ON "dashboard_widgets" USING btree ("dashboard_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboards_slug_uk" ON "dashboards" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboards_default_uk" ON "dashboards" USING btree ("is_default") WHERE "dashboards"."is_default";--> statement-breakpoint
CREATE INDEX "dashboards_owner_idx" ON "dashboards" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_index_path_uk" ON "content_index" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "content_index_kind_slug_uk" ON "content_index" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "content_index_category_idx" ON "content_index" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "content_index_server_idx" ON "content_index" USING btree ("server_slug");--> statement-breakpoint
CREATE INDEX "content_index_valid_idx" ON "content_index" USING btree ("valid");--> statement-breakpoint
CREATE INDEX "content_index_tags_idx" ON "content_index" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "content_index_search_idx" ON "content_index" USING gin ("search");--> statement-breakpoint
CREATE INDEX "probe_results_recent_idx" ON "probe_results" USING btree ("kind","slug","checked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at" DESC NULLS LAST);