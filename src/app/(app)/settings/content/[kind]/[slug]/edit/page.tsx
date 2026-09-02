import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/guard";
import { getRaw, getContent } from "@/lib/content/repo";
import { CONTENT_KINDS, type ContentKindT } from "@/lib/content/kinds";
import { Heading } from "@/components/settings/fields";
import { EditorForm } from "@/components/content/EditorForm";

export const dynamic = "force-dynamic";

export default async function EditContent({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePage("admin");
  const { kind: kindRaw, slug } = await params;
  if (!(CONTENT_KINDS as readonly string[]).includes(kindRaw)) notFound();
  const kind = kindRaw as ContentKindT;
  const file = await getRaw(kind, slug);
  if (!file) notFound();
  const row = await getContent(kind, slug);
  const { saved, error } = await searchParams;

  return (
    <div>
      <Heading path={`content/${kind}/${slug}`} />
      {error ? <p className="mb-2 text-sm text-err">! {error}</p> : null}
      {saved ? <p className="mb-2 text-sm text-ok">&gt; saved {kind}/{slug}.md</p> : null}
      {row && (row.errors ?? []).length ? (
        <ul className="mb-3 border border-border bg-bg-elevated p-2 text-xs">
          {row.errors.map((e, i) => (
            <li key={i} className={e.severity === "error" ? "text-err" : "text-warn"}>
              {e.severity}: {e.path} — {e.message}
            </li>
          ))}
        </ul>
      ) : null}
      <EditorForm kind={kind} slug={slug} initialRaw={file.raw} baseHash={file.hash} />
    </div>
  );
}
