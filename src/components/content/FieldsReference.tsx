import type { ContentKindT } from "@/lib/content/kinds";
import { fieldReference } from "@/lib/content/field-reference";

export function FieldsReference({ kind }: { kind: ContentKindT }) {
  const sections = fieldReference(kind);
  return (
    <details className="mb-3 border border-border bg-bg-elevated text-sm">
      <summary className="cursor-pointer px-3 py-2 text-accent-ink">
        available fields for {kind} (frontmatter)
      </summary>
      <div className="grid gap-4 px-3 pb-3 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title}>
            <h3 className="mb-1 text-xs uppercase tracking-wide text-fg-faint">{s.title}</h3>
            <ul className="flex flex-col gap-0.5">
              {s.fields.map((f) => (
                <li key={f.key} className="grid grid-cols-[minmax(9rem,auto)_1fr] gap-2 text-xs">
                  <code className="text-fg">
                    {f.key}
                    {f.req ? <span className="text-err">*</span> : null}
                  </code>
                  <span className="text-fg-muted">
                    {f.type}
                    {f.note ? <span className="text-fg-faint"> — {f.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
