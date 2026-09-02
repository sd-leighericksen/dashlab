"use client";
import { useEffect, useState } from "react";

const COOKIE = "dl-theme";

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => setTheme(readTheme()), []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${maxAge}; samesite=lax`;
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="text-fg-muted hover:text-accent-ink"
    >
      [{theme === "dark" ? "☀" : "☾"}]
    </button>
  );
}
