// Shared, dependency-free content-kind constants (safe in any context).
export const CONTENT_KINDS = ["service", "server", "external", "bookmark"] as const;
export type ContentKindT = (typeof CONTENT_KINDS)[number];

export const KIND_DIR: Record<ContentKindT, string> = {
  service: "services",
  server: "servers",
  external: "external",
  bookmark: "bookmarks",
};

export const DIR_KIND: Record<string, ContentKindT> = {
  services: "service",
  servers: "server",
  external: "external",
  bookmarks: "bookmark",
};
