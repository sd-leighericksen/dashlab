import { requirePage } from "@/lib/auth/guard";
import { listContent } from "@/lib/content/repo";
import { lintSummary } from "@/lib/content/repo";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
import { Heading, Notice } from "@/components/settings/fields";
import { trashContent } from "./actions";

export const dynamic = "force-dynamic";
const KIND_SEG: Record<ContentKindT, string> = { service: "s", server: "h", external: "x", bookmark: "b" };

export default async function ContentSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePage("admin");
  const { saved } = await searchParams;
  const lint = await lintSummary();
  const byKind = await Promise.all(
    CONTENT_KINDS.map(async (k) => ({ kind: k, rows: await listContent(k, { includeHidden: true }) })),
  );

  return (
    <div>
      <Heading path="content" />
      <div className="mb-4 flex items-center gap-4 text-sm">
        <a href="/settings/content/new" className="text-accent-ink">[+ new]</a>
        {lint.errors > 0 ? <span className="text-err">! {lint.errors} errors</span> : null}
        {lint.warnings > 0 ? <span className="text-warn">! {lint.warnings} warnings</span> : null}
        {lint.errors === 0 && lint.warnings === 0 ? <span className="text-ok">✓ all valid</span> : null}
      </div>

      {byKind.map(({ kind, rows }) => (
        <section key={kind} className="mb-5">
          <h2 className="mb-1 text-sm text-accent-ink">/{kind}s <span className="text-xs text-fg-muted">{rows.length}</span></h2>
          <ul className="text-sm">
            {rows.map((r) => {
              const errs = (r.errors ?? []).filter((e) => e.severity === "error").length;
              const warns = (r.errors ?? []).filter((e) => e.severity !== "error").length;
              return (
                <li key={r.id} className="flex items-center gap-3 border-b border-border/40 py-1.5">
                  <span className="w-4">
                    {errs ? <span className="text-err">✗</span> : warns ? <span className="text-warn">!</span> : <span className="text-ok">✓</span>}
                  </span>
                  <a href={`/settings/content/${kind}/${r.slug}/edit`} className="flex-1 text-fg hover:text-accent-ink">
                    {r.name} <span className="text-fg-faint">{r.path}</span>
                  </a>
                  {errs || warns ? (
                    <span className="text-xs text-fg-muted">{errs + warns} issue(s)</span>
                  ) : null}
                  <form action={trashContent}>
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="slug" value={r.slug} />
                    <button className="text-xs text-err hover:underline">[trash]</button>
                  </form>
                </li>
              );
            })}
            {rows.length === 0 ? <li className="py-1 text-fg-faint">none</li> : null}
          </ul>
        </section>
      ))}
      {saved ? <Notice>saved</Notice> : null}
    </div>
  );
}
