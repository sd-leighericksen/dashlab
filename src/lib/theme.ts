// Accent-token derivation. Pure functions, usable on server and client.
// Given an accent hex + fixed bg/fg pairs, compute:
//  - accentFg  : text colour ON accent fills (#080909 or #efeeec by contrast)
//  - accentInkDark / accentInkLight : accent-as-text nudged to >= 4.5:1 vs bg

const DARK_BG = "#080909";
const LIGHT_BG = "#efeeec";
const INK_DARK = "#080909";
const INK_LIGHT = "#efeeec";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function srgbToLin(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function relLuminance(c: RGB): number {
  return 0.2126 * srgbToLin(c.r) + 0.7152 * srgbToLin(c.g) + 0.0722 * srgbToLin(c.b);
}
export function contrastRatio(a: string, b: string): number {
  const la = relLuminance(hexToRgb(a));
  const lb = relLuminance(hexToRgb(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text on an accent fill: pick the fixed ink with the higher contrast. */
export function accentFg(accent: string): string {
  return contrastRatio(accent, INK_DARK) >= contrastRatio(accent, INK_LIGHT)
    ? INK_DARK
    : INK_LIGHT;
}

// Move a colour toward black or white in small steps until it clears `target`
// contrast against `bg`. Direction: darken for light bg, lighten for dark bg.
function adjustForContrast(accent: string, bg: string, target = 4.5): string {
  if (contrastRatio(accent, bg) >= target) return accent;
  const bgLum = relLuminance(hexToRgb(bg));
  const toward: RGB = bgLum > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  const start = hexToRgb(accent);
  for (let i = 1; i <= 200; i++) {
    const t = i / 200;
    const mixed: RGB = {
      r: start.r + (toward.r - start.r) * t,
      g: start.g + (toward.g - start.g) * t,
      b: start.b + (toward.b - start.b) * t,
    };
    const hex = rgbToHex(mixed);
    if (contrastRatio(hex, bg) >= target) return hex;
  }
  return rgbToHex(toward);
}

export type AccentTokens = {
  accent: string;
  accentFg: string;
  accentInkDark: string;
  accentInkLight: string;
};

export function accentTokens(accent: string): AccentTokens {
  return {
    accent,
    accentFg: accentFg(accent),
    accentInkDark: adjustForContrast(accent, DARK_BG),
    accentInkLight: adjustForContrast(accent, LIGHT_BG),
  };
}

/** Inline style object for a dashboard/root element. */
export function accentStyle(accent: string): Record<string, string> {
  const t = accentTokens(accent);
  return {
    "--accent": t.accent,
    "--accent-fg": t.accentFg,
    "--accent-ink-dark": t.accentInkDark,
    "--accent-ink-light": t.accentInkLight,
  };
}

export function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}
