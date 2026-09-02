import "server-only";
import figlet from "figlet";
import { BANNER_FONT_DATA, BANNER_FONTS, type BannerFont } from "./banner-fonts";

export { BANNER_FONTS };
export type { BannerFont };

const g = globalThis as {
  __dashlabFonts?: boolean;
  __dashlabBannerCache?: Map<string, BannerLines>;
};
g.__dashlabBannerCache ??= new Map();

function ensureFonts(): void {
  if (g.__dashlabFonts) return;
  for (const [name, data] of Object.entries(BANNER_FONT_DATA)) {
    try {
      figlet.parseFont(name, data);
    } catch {
      /* ignore a bad font */
    }
  }
  g.__dashlabFonts = true;
}

export type BannerLines = { lines: string[]; cols: number; rows: number };

export function isBannerFont(f: string): f is BannerFont {
  return (BANNER_FONTS as readonly string[]).includes(f);
}

export function renderBanner(text: string, font: string = "ANSI Shadow"): BannerLines {
  ensureFonts();
  const useFont = isBannerFont(font) ? font : "ANSI Shadow";
  const key = useFont + " " + text;
  const cached = g.__dashlabBannerCache!.get(key);
  if (cached) return cached;
  let raw = "";
  try {
    raw = figlet.textSync(text, { font: useFont, horizontalLayout: "default" });
  } catch {
    raw = text;
  }
  const lines = raw.replace(/\s+$/g, "").split("\n").filter((l) => l.length > 0);
  const cols = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const result: BannerLines = { lines, cols, rows: lines.length };
  g.__dashlabBannerCache!.set(key, result);
  return result;
}
