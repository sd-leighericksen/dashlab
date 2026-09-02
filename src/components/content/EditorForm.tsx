"use client";
import { useState } from "react";
import { saveContent } from "@/app/(app)/settings/content/actions";

export function EditorForm({
  kind,
  slug,
  initialRaw,
  baseHash,
}: {
  kind: string;
  slug: string;
  initialRaw: string;
  baseHash: string;
}) {
  const [raw, setRaw] = useState(initialRaw);
  const dirty = raw !== initialRaw;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget;
      const s = t.selectionStart;
      const end = t.selectionEnd;
      const next = raw.slice(0, s) + "  " + raw.slice(end);
      setRaw(next);
      requestAnimationFrame(() => {
        t.selectionStart = t.selectionEnd = s + 2;
      });
    }
  };

  return (
    <form action={saveContent} className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="baseHash" value={baseHash} />
      <input type="hidden" name="raw" value={raw} />
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        rows={28}
        className="w-full resize-y border border-border bg-bg-elevated p-3 font-mono text-sm leading-relaxed text-fg outline-none focus:border-accent-ink"
      />
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="border border-accent-ink px-3 py-1 text-sm text-accent-ink hover:bg-accent-soft"
        >
          [ save {dirty ? "*" : ""} ]
        </button>
        <a
          href="/settings/content"
          className="text-xs text-fg-muted hover:text-accent-ink"
        >
          [cancel]
        </a>
        <span className="text-xs text-fg-faint">{raw.length} bytes</span>
      </div>
    </form>
  );
}
