import type { ProbeState } from "@/lib/db/schema";

type State = "up" | "down" | "unknown" | "disabled";

const GLYPH: Record<State, string> = {
  up: "●",
  down: "○",
  unknown: "◌",
  disabled: "·",
};
const COLOR: Record<State, string> = {
  up: "text-ok",
  down: "text-err",
  unknown: "text-fg-faint",
  disabled: "text-fg-faint",
};

export function StatusDot({ probe }: { probe: ProbeState | null }) {
  const state: State = (probe?.state as State) ?? "unknown";
  const uptime = probe?.uptime24h != null ? `, ${probe.uptime24h}% 24h uptime` : "";
  return (
    <span
      role="img"
      aria-label={`${state}${uptime}`}
      className={`inline-block w-[2ch] text-center ${COLOR[state]}`}
    >
      {GLYPH[state]}
    </span>
  );
}
