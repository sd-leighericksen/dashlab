import { withApi, json, readJson } from "@/lib/api/http";
import { err } from "@/lib/api/errors";
import { validateRaw } from "@/lib/content/repo";
import { composeRaw } from "@/lib/content/writer";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApi({ auth: "required" }, async ({ req }) => {
  const b = await readJson<{
    kind: string;
    raw?: string;
    frontmatter?: Record<string, unknown>;
    body?: string;
    render?: boolean;
  }>(req);
  if (!(CONTENT_KINDS as readonly string[]).includes(b.kind)) throw err.badRequest("invalid kind");
  const kind = b.kind as ContentKindT;
  const raw = b.raw ?? composeRaw(b.frontmatter ?? {}, b.body ?? "");
  const result = await validateRaw(kind, raw, b.render ?? false);
  return json(result);
});
