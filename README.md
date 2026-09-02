# dashlab

Self-hosted homelab dashboard for Nimbus Cloud. Command-line aesthetic, markdown-backed
records, multi-user multi-dashboard, built-in status probes, REST API + MCP (P2), and
Beszel / Uptime Kuma / OpenRouter widgets (P3).

Stack: Next.js 16 (App Router) · React 19 · Postgres 17 + Drizzle · Tailwind 4 · GSAP · Docker.

## Quickstart (dev)

```bash
docker compose -f docker/compose.dev.yml up -d   # Postgres on :5438
cp .env.example .env                             # adjust if needed
npm install
npm run dev
```

Open the app, complete `/setup` with the code printed in the terminal, and you land on
your first dashboard at `/d/<8-char-slug>`.

## Production (Docker)

```bash
cd docker
cp .env.example .env      # set POSTGRES_PASSWORD, DASHLAB_SECRET, PUBLIC_URL
docker compose up -d --build
```

Migrations run automatically at boot. First run prints a `/setup` code to the container
logs (`docker logs dashlab`), or set `DASHLAB_SETUP_USERNAME` / `SETUP_PASSWORD` to
bootstrap headlessly.

## Content

Records are markdown files with YAML frontmatter under `CONTENT_DIR`
(`/data/content/{services,servers,external}`). Edit them three ways:

- in-app editor (Settings → content)
- REST API / MCP (P2)
- directly on disk (Obsidian / VS Code) — a watcher re-indexes changes

Templates live in `content/_templates/`. Never put passwords, API keys, or secrets in a
content file — the indexer rejects them.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build (no DB needed)
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run db:generate  # generate a Drizzle migration after schema changes
npm run gen:secret   # print a DASHLAB_SECRET
```

See `.claude/plans/` for the full build plan.
