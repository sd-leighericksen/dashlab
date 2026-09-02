export function StatusLine({
  prompt,
  counts,
}: {
  prompt: string;
  counts: { total: number; up: number; down: number; unknown: number };
}) {
  return (
    <p className="text-sm text-fg-muted" aria-live="polite">
      <span className="text-accent-ink">{prompt}</span>{" "}
      {counts.total} services · <span className="text-ok">{counts.up} up</span>
      {counts.down > 0 ? (
        <>
          {" · "}
          <span className="text-err">{counts.down} down</span>
        </>
      ) : null}
      {counts.unknown > 0 ? ` · ${counts.unknown} unknown` : ""}{" "}
      <span className="dl-cursor text-accent-ink">▋</span>
    </p>
  );
}
