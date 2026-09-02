const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function Sparkline({ values, ariaLabel }: { values: number[]; ariaLabel?: string }) {
  if (!values.length) return <span className="text-fg-faint">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const chars = values
    .map((v) => BLOCKS[Math.min(BLOCKS.length - 1, Math.round(((v - min) / span) * (BLOCKS.length - 1)))])
    .join("");
  return (
    <span aria-label={ariaLabel} className="text-accent-ink">
      {chars}
    </span>
  );
}
