import localFont from "next/font/local";

export const mono = localFont({
  src: "../app/fonts/jetbrains-mono-wght.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-jetbrains-mono",
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "DejaVu Sans Mono",
    "monospace",
  ],
});
