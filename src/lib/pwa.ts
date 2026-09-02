import type { Metadata, Viewport } from "next";

// iOS launch images. device-width/height + dpr + orientation per Apple.
type Splash = { url: string; media: string };
const s = (w: number, h: number, dpr: number, o: "portrait" | "landscape", file: string): Splash => ({
  url: `/splash/${file}`,
  media: `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${o})`,
});

export const appleStartupImages: Splash[] = [
  s(430, 932, 3, "portrait", "splash-1290x2796.png"),
  s(430, 932, 3, "landscape", "splash-2796x1290.png"),
  s(393, 852, 3, "portrait", "splash-1179x2556.png"),
  s(393, 852, 3, "landscape", "splash-2556x1179.png"),
  s(375, 667, 2, "portrait", "splash-750x1334.png"),
  s(375, 667, 2, "landscape", "splash-1334x750.png"),
  s(1024, 1366, 2, "portrait", "splash-2048x2732.png"),
  s(1024, 1366, 2, "landscape", "splash-2732x2048.png"),
  s(834, 1194, 2, "portrait", "splash-1668x2388.png"),
  s(834, 1194, 2, "landscape", "splash-2388x1668.png"),
  s(820, 1180, 2, "portrait", "splash-1640x2360.png"),
  s(820, 1180, 2, "landscape", "splash-2360x1640.png"),
  s(768, 1024, 2, "portrait", "splash-1536x2048.png"),
  s(768, 1024, 2, "landscape", "splash-2048x1536.png"),
];

const BLACK_CIRCLE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23080909'/%3E%3C/svg%3E";

// Shared across both root layouts.
export const pwaMetadata: Metadata = {
  applicationName: "DashLab",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DashLab",
    statusBarStyle: "black-translucent",
    startupImage: appleStartupImages,
  },
  icons: {
    icon: BLACK_CIRCLE, // browser-tab favicon stays a black disc
    apple: [{ url: "/icons/icon-180x180.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const pwaViewport: Viewport = {
  themeColor: "#080909",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
