import "server-only";
import { z } from "zod";
import type { McpServer, AuthInfo } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/actor";
import { scopesForRole, roleAtLeast } from "@/lib/auth/roles";
import { DomainError } from "@/lib/api/errors";
import type { ContentKindT } from "@/lib/content/kinds";
import { listContent, getContent } from "@/lib/content/repo";
import { validateRaw } from "@/lib/content/repo";
import { composeRaw } from "@/lib/content/writer";
import {
  createContent,
  patchContent,
  removeContent,
  probeFor,
} from "@/lib/content/service";
import { serializeContent } from "@/lib/api/serialize";
import { listCategories, createCategory } from "@/lib/categories";
import { listDashboards, getDashboardBySlug } from "@/lib/dashboards/queries";
import { addDashboardItem, removeDashboardItem } from "@/lib/dashboards/mutations";
import { db as _db } from "@/lib/db/client";
import { probeState } from "@/lib/db/schema";
import { audit } from "@/lib/api/audit";
import { slugify } from "@/lib/crypto/random";

type ToolCtx = { http?: { authInfo?: AuthInfo } };
type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
};

async function actorFromCtx(ctx: ToolCtx): Promise<Actor> {
  const userId = ctx.http?.authInfo?.extra?.userId as string | undefined;
  if (!userId) throw new DomainError("unauthorized", "no actor");
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.disabledAt) throw new DomainError("unauthorized", "user not found");
  return { user: user as User, via: "api_key", role: user.role, scopes: scopesForRole(user.role) };
}

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data as object };
}
function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
async function run(ctx: ToolCtx, fn: (actor: Actor) => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn(await actorFromCtx(ctx)));
  } catch (e) {
    if (e instanceof DomainError) return fail(`${e.code}: ${e.detail}`);
    return fail(`error: ${(e as Error).message}`);
  }
}
function reg(
  server: McpServer,
  name: string,
  config: unknown,
  cb: (args: never, ctx: ToolCtx) => Promise<ToolResult>,
): void {
  (server.registerTool as unknown as (n: string, c: unknown, f: unknown) => void)(name, config, cb);
}
function assertAdmin(actor: Actor): void {
  if (!roleAtLeast(actor.role, "admin")) throw new DomainError("forbidden", "admin role required");
}

const KIND_META: { kind: ContentKindT; one: string; many: string }[] = [
  { kind: "service", one: "service", many: "services" },
  { kind: "server", one: "server", many: "servers" },
  { kind: "external", one: "external_service", many: "external_services" },
];

const ro = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

function registerContentTools(server: McpServer, kind: ContentKindT, one: string, many: string) {
  reg(server, 
    `list_${many}`,
    {
      title: `List ${many}`,
      description: `List ${many} from the content index. Filters: category, server, status, q, tag.`,
      inputSchema: z.object({
        category: z.string().optional(),
        server: z.string().optional(),
        status: z.string().optional(),
        q: z.string().optional(),
        tag: z.string().optional(),
      }),
      annotations: ro,
    },
    (args: Record<string, unknown>, ctx: ToolCtx) =>
      run(ctx, async () => {
        const rows = await listContent(kind, args as never);
        return { items: rows.map((r) => ({ slug: r.slug, name: r.name, category: r.categorySlug, valid: r.valid })) };
      }),
  );

  reg(server, 
    `get_${one}`,
    {
      title: `Get ${one}`,
      description: `Get one ${one} incl. frontmatter, markdown body and file hash (use the hash as expectedHash when updating).`,
      inputSchema: z.object({ slug: z.string() }),
      annotations: ro,
    },
    (args: { slug: string }, ctx: ToolCtx) =>
      run(ctx, async () => {
        const row = await getContent(kind, args.slug);
        if (!row) throw new DomainError("not_found", `${one} not found`);
        return serializeContent(row, await probeFor(kind, row.slug), { body: true });
      }),
  );

  reg(server, 
    `create_${one}`,
    {
      title: `Create ${one}`,
      description: `Create a ${one} markdown file. Validate first with validate_markdown. Fails if the slug exists unless ifNotExists.`,
      inputSchema: z.object({
        slug: z.string().optional(),
        frontmatter: z.record(z.string(), z.unknown()),
        body: z.string().default(""),
        ifNotExists: z.boolean().default(false),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    (args: { slug?: string; frontmatter: Record<string, unknown>; body?: string; ifNotExists?: boolean }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const row = await createContent(kind, args);
        await audit(actor, `mcp_create_${kind}`, row.path);
        return serializeContent(row, null, { body: true });
      }),
  );

  reg(server, 
    `update_${one}`,
    {
      title: `Update ${one}`,
      description: `Merge-update frontmatter (null deletes a key) and/or replace body. Pass expectedHash from get_${one} unless force.`,
      inputSchema: z.object({
        slug: z.string(),
        frontmatter: z.record(z.string(), z.unknown()).nullable().optional(),
        body: z.string().optional(),
        expectedHash: z.string().optional(),
        force: z.boolean().default(false),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    (args: { slug: string; frontmatter?: Record<string, unknown> | null; body?: string; expectedHash?: string; force?: boolean }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const ifMatch = args.expectedHash?.replace(/^sha256:/, "") ?? null;
        const row = await patchContent(kind, args.slug, { frontmatter: args.frontmatter, body: args.body }, ifMatch, args.force);
        await audit(actor, `mcp_update_${kind}`, row.path);
        return serializeContent(row, null, { body: true });
      }),
  );

  reg(server, 
    `delete_${one}`,
    {
      title: `Delete ${one}`,
      description: `Move a ${one} to _trash and remove it from all dashboards. confirm must be true.`,
      inputSchema: z.object({ slug: z.string(), confirm: z.literal(true) }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    (args: { slug: string }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const res = await removeContent(kind, args.slug);
        await audit(actor, `mcp_delete_${kind}`, `${kind}/${args.slug}`);
        return { deleted: true, ...res };
      }),
  );
}

export function buildServer(server: McpServer): void {
  for (const m of KIND_META) registerContentTools(server, m.kind, m.one, m.many);

  reg(server, 
    "list_categories",
    { title: "List categories", description: "List all categories.", inputSchema: z.object({}), annotations: ro },
    (_args: unknown, ctx: ToolCtx) =>
      run(ctx, async () => ({ items: (await listCategories()).map((c) => ({ slug: c.slug, name: c.name })) })),
  );

  reg(server, 
    "upsert_category",
    {
      title: "Create category",
      description: "Create a category (name + optional slug/glyph).",
      inputSchema: z.object({ name: z.string(), slug: z.string().optional(), glyph: z.string().optional() }),
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    (args: { name: string; slug?: string; glyph?: string }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const slug = slugify(args.slug ?? args.name);
        await createCategory({ name: args.name, slug, glyph: args.glyph });
        return { slug, name: args.name };
      }),
  );

  reg(server, 
    "list_dashboards",
    { title: "List dashboards", description: "List dashboards (slug, name).", inputSchema: z.object({}), annotations: ro },
    (_args: unknown, ctx: ToolCtx) =>
      run(ctx, async () => ({ items: (await listDashboards()).map((d) => ({ slug: d.slug, name: d.name, isPublic: d.isPublic })) })),
  );

  reg(server, 
    "add_item_to_dashboard",
    {
      title: "Add item to dashboard",
      description: "Place a service/server/external onto a dashboard.",
      inputSchema: z.object({
        dashboard: z.string(),
        kind: z.enum(["service", "server", "external"]),
        slug: z.string(),
        categorySlug: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    (args: { dashboard: string; kind: ContentKindT; slug: string; categorySlug?: string }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const dash = await getDashboardBySlug(args.dashboard);
        if (!dash) throw new DomainError("not_found", "dashboard not found");
        await addDashboardItem(dash.id, args.kind, args.slug, args.categorySlug);
        return { ok: true };
      }),
  );

  reg(server, 
    "remove_item_from_dashboard",
    {
      title: "Remove item from dashboard",
      description: "Remove a service/server/external from a dashboard.",
      inputSchema: z.object({
        dashboard: z.string(),
        kind: z.enum(["service", "server", "external"]),
        slug: z.string(),
      }),
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    (args: { dashboard: string; kind: ContentKindT; slug: string }, ctx: ToolCtx) =>
      run(ctx, async (actor) => {
        assertAdmin(actor);
        const dash = await getDashboardBySlug(args.dashboard);
        if (!dash) throw new DomainError("not_found", "dashboard not found");
        await removeDashboardItem(dash.id, args.kind, args.slug);
        return { ok: true };
      }),
  );

  reg(server, 
    "get_probe_status",
    {
      title: "Get probe status",
      description: "Current up/down status + uptime for items. Optional kind/slug/state filter.",
      inputSchema: z.object({
        kind: z.enum(["service", "server", "external"]).optional(),
        slug: z.string().optional(),
        state: z.enum(["up", "down", "unknown", "disabled"]).optional(),
      }),
      annotations: ro,
    },
    (args: { kind?: ContentKindT; slug?: string; state?: string }, ctx: ToolCtx) =>
      run(ctx, async () => {
        let rows = await _db.select().from(probeState);
        if (args.kind) rows = rows.filter((r) => r.kind === args.kind);
        if (args.slug) rows = rows.filter((r) => r.slug === args.slug);
        if (args.state) rows = rows.filter((r) => r.state === args.state);
        return {
          items: rows.map((r) => ({
            kind: r.kind, slug: r.slug, state: r.state,
            uptime24h: r.uptime24h, latencyMs: r.lastLatencyMs, error: r.lastError,
          })),
        };
      }),
  );

  reg(server, 
    "validate_markdown",
    {
      title: "Validate markdown",
      description: "Validate a content file (frontmatter + body) against the schema without saving.",
      inputSchema: z.object({
        kind: z.enum(["service", "server", "external"]),
        raw: z.string().optional(),
        frontmatter: z.record(z.string(), z.unknown()).optional(),
        body: z.string().optional(),
      }),
      annotations: ro,
    },
    (args: { kind: ContentKindT; raw?: string; frontmatter?: Record<string, unknown>; body?: string }, ctx: ToolCtx) =>
      run(ctx, async () => {
        const raw = args.raw ?? composeRaw(args.frontmatter ?? {}, args.body ?? "");
        return validateRaw(args.kind, raw, false);
      }),
  );

  reg(server, 
    "get_machine_stats",
    { title: "Beszel machine stats", description: "Beszel snapshot (lands in P3).", inputSchema: z.object({}), annotations: { ...ro, openWorldHint: true } },
    (_args: unknown, ctx: ToolCtx) => run(ctx, async () => ({ configured: false, message: "Beszel integration lands in P3" })),
  );
  reg(server, 
    "get_uptime",
    { title: "Uptime Kuma", description: "Uptime snapshot (lands in P3).", inputSchema: z.object({}), annotations: { ...ro, openWorldHint: true } },
    (_args: unknown, ctx: ToolCtx) => run(ctx, async () => ({ configured: false, message: "Uptime Kuma integration lands in P3" })),
  );
  reg(server, 
    "get_openrouter_usage",
    { title: "OpenRouter usage", description: "OpenRouter spend (lands in P3).", inputSchema: z.object({}), annotations: { ...ro, openWorldHint: true } },
    (_args: unknown, ctx: ToolCtx) => run(ctx, async () => ({ configured: false, message: "OpenRouter integration lands in P3" })),
  );
}
