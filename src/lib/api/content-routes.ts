import "server-only";
import { withApi, json, readJson, readText, type ApiCtx } from "./http";
import { err } from "./errors";
import { strongEtag, parseIfMatch } from "./etag";
import { paginate } from "./pagination";
import { serializeContent, apiPath } from "./serialize";
import type { ContentKindT } from "@/lib/content/kinds";
import { listContent, getContent, getRaw, validateRaw, type ListFilter } from "@/lib/content/repo";
import {
  createContent,
  updateFull,
  patchContent,
  writeWholeRaw,
  removeContent,
  rename,
  probeFor,
} from "@/lib/content/service";
import { audit } from "./audit";

export function collectionRoutes(kind: ContentKindT) {
  const GET = withApi({ auth: "required" }, async ({ url }: ApiCtx) => {
    const q = url.searchParams;
    const filter: ListFilter = {
      category: q.get("category") ?? undefined,
      server: q.get("server") ?? undefined,
      status: q.get("status") ?? undefined,
      q: q.get("q") ?? undefined,
      tag: q.get("tag") ?? undefined,
      includeHidden: q.get("includeHidden") === "true",
    };
    const include = (q.get("include") ?? "").split(",");
    const limit = Math.min(Number(q.get("limit") ?? 50) || 50, 200);
    const rows = await listContent(kind, filter);
    const page = paginate(rows, limit, q.get("cursor"), (r) => ({ k: r.name, s: r.slug }));
    const items = await Promise.all(
      page.items.map(async (r) =>
        serializeContent(r, await probeFor(kind, r.slug), {
          body: include.includes("body"),
          html: include.includes("html"),
        }),
      ),
    );
    return json({ items, nextCursor: page.nextCursor, total: page.total });
  });

  const POST = withApi({ role: "admin" }, async ({ req, actor }: ApiCtx) => {
    const body = await readJson<{
      slug?: string;
      frontmatter: Record<string, unknown>;
      body?: string;
      ifNotExists?: boolean;
    }>(req);
    if (!body?.frontmatter || typeof body.frontmatter !== "object")
      throw err.badRequest("frontmatter object required");
    const row = await createContent(kind, body);
    await audit(actor, `create_${kind}`, row.path, { afterHash: row.hash });
    return json(serializeContent(row, null, { body: true }), {
      status: 201,
      headers: { location: apiPath(kind, row.slug), etag: strongEtag(row.hash) },
    });
  });

  return { GET, POST };
}

export function itemRoutes(kind: ContentKindT) {
  const GET = withApi({ auth: "required" }, async ({ req, url, params }: ApiCtx) => {
    const row = await getContent(kind, params.slug);
    if (!row) throw err.notFound();
    const etag = strongEtag(row.hash);
    if (req.headers.get("if-none-match")?.includes(row.hash))
      return new Response(null, { status: 304, headers: { etag } });
    const include = (url.searchParams.get("include") ?? "body").split(",");
    return json(
      serializeContent(row, await probeFor(kind, row.slug), {
        body: include.includes("body"),
        html: include.includes("html"),
      }),
      { headers: { etag } },
    );
  });

  const PUT = withApi({ role: "admin" }, async ({ req, params, actor }: ApiCtx) => {
    const body = await readJson<{ frontmatter: Record<string, unknown>; body: string; force?: boolean }>(req);
    const ifMatch = parseIfMatch(req.headers.get("if-match"));
    const row = await updateFull(kind, params.slug, { frontmatter: body.frontmatter, body: body.body ?? "" }, ifMatch, body.force);
    await audit(actor, `update_${kind}`, row.path, { afterHash: row.hash });
    return json(serializeContent(row, await probeFor(kind, row.slug), { body: true }), {
      headers: { etag: strongEtag(row.hash) },
    });
  });

  const PATCH = withApi({ role: "admin" }, async ({ req, params, actor }: ApiCtx) => {
    const body = await readJson<{ frontmatter?: Record<string, unknown> | null; body?: string; force?: boolean }>(req);
    const ifMatch = parseIfMatch(req.headers.get("if-match"));
    const row = await patchContent(kind, params.slug, { frontmatter: body.frontmatter, body: body.body }, ifMatch, body.force);
    await audit(actor, `patch_${kind}`, row.path, { afterHash: row.hash });
    return json(serializeContent(row, await probeFor(kind, row.slug), { body: true }), {
      headers: { etag: strongEtag(row.hash) },
    });
  });

  const DELETE = withApi({ role: "admin" }, async ({ req, params, actor }: ApiCtx) => {
    const ifMatch = parseIfMatch(req.headers.get("if-match"));
    const current = await getRaw(kind, params.slug);
    if (current && ifMatch && ifMatch !== current.hash) throw err.etagMismatch(`sha256:${current.hash}`);
    const { trashPath } = await removeContent(kind, params.slug);
    await audit(actor, `delete_${kind}`, `${kind}/${params.slug}`, { trashPath });
    return new Response(null, { status: 204 });
  });

  return { GET, PUT, PATCH, DELETE };
}

export function rawRoutes(kind: ContentKindT) {
  const GET = withApi({ auth: "required" }, async ({ params }: ApiCtx) => {
    const file = await getRaw(kind, params.slug);
    if (!file) throw err.notFound();
    return new Response(file.raw, {
      headers: { "content-type": "text/markdown; charset=utf-8", etag: strongEtag(file.hash) },
    });
  });
  const PUT = withApi({ role: "admin" }, async ({ req, params, actor }: ApiCtx) => {
    const raw = await readText(req);
    const ifMatch = parseIfMatch(req.headers.get("if-match"));
    const body = req.headers.get("x-force") === "true";
    const { hash } = await writeWholeRaw(kind, params.slug, raw, ifMatch, body);
    await audit(actor, `write_raw_${kind}`, `${kind}/${params.slug}`, { afterHash: hash });
    return json({ ok: true, hash: `sha256:${hash}` }, { headers: { etag: strongEtag(hash) } });
  });
  return { GET, PUT };
}

export function renameRoute(kind: ContentKindT) {
  const POST = withApi({ role: "admin" }, async ({ req, params, actor }: ApiCtx) => {
    const body = await readJson<{ newSlug: string }>(req);
    if (!body?.newSlug) throw err.badRequest("newSlug required");
    const row = await rename(kind, params.slug, body.newSlug);
    await audit(actor, `rename_${kind}`, row.path, { from: params.slug });
    return json(serializeContent(row, null, { body: true }), {
      headers: { location: apiPath(kind, row.slug) },
    });
  });
  return { POST };
}

export { validateRaw };
