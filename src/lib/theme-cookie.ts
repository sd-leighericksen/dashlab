import "server-only";
import { cookies } from "next/headers";
import type { ThemeMode } from "@/lib/content/types";

export const THEME_COOKIE = "dl-theme";

export async function readThemePref(): Promise<"light" | "dark" | null> {
  const jar = await cookies();
  const v = jar.get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : null;
}

export function resolveTheme(
  pref: "light" | "dark" | null,
  fallback: ThemeMode,
): "light" | "dark" {
  if (pref) return pref;
  return fallback === "light" ? "light" : "dark";
}
