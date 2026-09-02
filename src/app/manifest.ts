import type { MetadataRoute } from "next";

const SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

export default function manifest(): MetadataRoute.Manifest {
  const icons: MetadataRoute.Manifest["icons"] = SIZES
    .map((s) => ({
      src: `/icons/icon-${s}x${s}.png`,
      sizes: `${s}x${s}`,
      type: "image/png",
      purpose: "any" as const,
    }))
    // only the sizes that actually exist on disk
    .filter((i) => [48, 96, 128, 144, 152, 192, 384, 512].includes(Number(i.sizes.split("x")[0])));
  icons.push({
    src: "/icons/icon-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });
  return {
    name: "DashLab",
    short_name: "DashLab",
    description: "Self-hosted homelab dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#080909",
    theme_color: "#080909",
    icons,
  };
}
