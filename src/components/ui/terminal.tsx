import type { ReactNode } from "react";

export function Prompt({ children = "$" }: { children?: ReactNode }) {
  return <span className="text-accent-ink select-none">{children}</span>;
}

export function Cursor() {
  return <span className="dl-cursor text-accent-ink">▋</span>;
}

export function TerminalBox({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative border border-border bg-bg-elevated ${className}`}
    >
      {title ? (
        <span className="absolute -top-[0.7em] left-3 bg-bg px-1 text-xs text-fg-muted">
          ┌─ {title}
        </span>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
