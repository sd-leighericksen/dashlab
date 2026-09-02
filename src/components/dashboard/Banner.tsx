import { renderBanner } from "@/lib/banner";
import type { CSSProperties } from "react";

export function Banner({
  text,
  font = "ANSI Shadow",
  ariaLabel,
}: {
  text: string;
  font?: string;
  ariaLabel?: string;
}) {
  const { lines, cols } = renderBanner(text, font);
  const style = {
    "--cols": String(cols),
    fontSize: "clamp(0.35rem, calc(100cqw / (var(--cols) * 0.62)), 1.4rem)",
    lineHeight: "1",
    letterSpacing: "0",
    whiteSpace: "pre",
    overflow: "hidden",
  } as CSSProperties;
  return (
    <div className="@container w-full">
      <pre
        role="img"
        aria-label={ariaLabel ?? text}
        className="text-accent-ink font-mono"
        style={style}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
