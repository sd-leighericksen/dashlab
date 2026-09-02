# dashlab — Claude Code notes

Self-hosted homelab dashboard. Markdown files are the source of truth for content;
Postgres indexes them and holds users/dashboards/settings/probes.

## Stack
Next.js 16 App Router · React 19 · TypeScript (pinned `~6.0.3`) · Tailwind v4 · Drizzle +
`pg` (Postgres 17) · `@node-rs/argon2` · GSAP · figlet (embedded fonts) · shiki · zod 4.

## Layout
- `src/lib/db/schema/*` — Drizzle tables (edit → `npm run db:generate` → commit `drizzle/`).
- `src/lib/content/*` — schemas, frontmatter parse, render (unified+shiki), indexer, watcher,
  writer, repo. One serial queue (`queue.ts`) serializes all indexing.
- `src/lib/auth/*` — hand-rolled sessions (sha256 cookie), argon2id, `getActor()` (cookie or
  `dl_` bearer key), roles, guard.
- `src/lib/server/probes/*` — HTTP/TCP prober + scheduler (in-process, started from
  `src/instrumentation.ts` → `src/lib/boot.ts`).
- `src/app/(app)/*` — global-theme routes (login, setup, settings, account).
- `src/app/(dash)/*` — per-dashboard root layout (theme/accent from DB via `x-dashlab-pathname`
  header set by `src/proxy.ts`), dashboard + detail pages.

## Conventions
- Server components read via `src/lib/**` directly; mutations are Server Actions.
- Every DB/auth module is `import "server-only"`. CLI scripts run with
  `node --conditions=react-server` (see `package.json`).
- Keep `next build` DB-free: the pg pool is lazy (`src/lib/db/client.ts`), all DB pages are
  `force-dynamic`.
- Content-kind dirs: services/servers/external ↔ kinds service/server/external (`kinds.ts`).
- Secrets never go in markdown; integration secrets are env-only in P1.

## Status
P1 + P2 complete. P1: auth, content pipeline, dashboards, detail pages, probes, settings, Docker.
P2: REST API (/api/v1), MCP server (/mcp) with per-user API keys, Notion importer (scripts/import-notion.ts).
P3 complete: integration runner + Beszel / Uptime Kuma / OpenRouter clients, widgets, and detail pages (/d/[slug]/w/*), stats API (/api/v1/stats). Secrets are env-only (src/lib/server/secrets.ts). Full plan: `.claude/plans/i-want-to-build-effervescent-bengio.md`.
