import type { NextConfig } from "next";

const PUBLIC_URL = process.env.PUBLIC_URL;

const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

if (process.env.DASHLAB_HSTS === "1") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: { root: import.meta.dirname },
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  typedRoutes: false,
  // pg / argon2 / shiki / pino are native or heavy; keep them external to the bundle.
  serverExternalPackages: [
    "pg",
    "@node-rs/argon2",
    "shiki",
    "pino",
    "chokidar",
    "undici",
    "figlet",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  env: {
    DASHLAB_PUBLIC_URL: PUBLIC_URL ?? "",
  },
};

export default nextConfig;
