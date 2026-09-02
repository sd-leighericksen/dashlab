"use client";
import { useEffect, useState } from "react";

export function InlineClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="text-sm text-fg-muted tabular-nums" suppressHydrationWarning>--:--:--</span>;
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
  return (
    <span className="shrink-0 text-sm text-fg-muted tabular-nums" suppressHydrationWarning>
      {date} <span className="text-accent-ink">{time}</span>
    </span>
  );
}
