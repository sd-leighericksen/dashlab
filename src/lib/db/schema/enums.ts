import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["superuser", "admin", "user"]);
export const contentKind = pgEnum("content_kind", [
  "service",
  "server",
  "external",
  "bookmark",
]);
export const themeMode = pgEnum("theme_mode", ["light", "dark", "system"]);
export const addressType = pgEnum("address_type", [
  "domain",
  "tailscale",
  "local",
]);
export const openMode = pgEnum("open_mode", ["new_tab", "same_tab", "overlay"]);
export const layoutMode = pgEnum("layout_mode", ["list", "cards"]);
export const probeStatus = pgEnum("probe_status", [
  "up",
  "down",
  "unknown",
  "disabled",
]);
