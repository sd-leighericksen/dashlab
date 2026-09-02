// Single source of the REST surface, rendered on the API settings page.
export type ApiEndpoint = { method: string; path: string; role: string; desc: string };
export type ApiGroup = { group: string; endpoints: ApiEndpoint[] };

const content = (seg: string, name: string): ApiEndpoint[] => [
  { method: "GET", path: `/api/v1/${seg}`, role: "user", desc: `list ${name} (filters: category, server, status, q, tag, limit, cursor, include)` },
  { method: "POST", path: `/api/v1/${seg}`, role: "admin", desc: `create ${name}` },
  { method: "GET", path: `/api/v1/${seg}/{slug}`, role: "user", desc: `get one (ETag; ?include=body,html)` },
  { method: "PUT", path: `/api/v1/${seg}/{slug}`, role: "admin", desc: "full replace (If-Match)" },
  { method: "PATCH", path: `/api/v1/${seg}/{slug}`, role: "admin", desc: "merge frontmatter + body (If-Match)" },
  { method: "DELETE", path: `/api/v1/${seg}/{slug}`, role: "admin", desc: "move to trash (If-Match)" },
  { method: "GET/PUT", path: `/api/v1/${seg}/{slug}/raw`, role: "user/admin", desc: "raw markdown" },
  { method: "POST", path: `/api/v1/${seg}/{slug}/rename`, role: "admin", desc: "rename slug" },
];

export const API_GROUPS: ApiGroup[] = [
  { group: "services", endpoints: content("services", "services") },
  { group: "servers", endpoints: content("servers", "servers") },
  { group: "external services", endpoints: content("external-services", "external services") },
  {
    group: "content",
    endpoints: [
      { method: "POST", path: "/api/v1/validate", role: "user", desc: "validate markdown without saving" },
    ],
  },
  {
    group: "categories",
    endpoints: [
      { method: "GET", path: "/api/v1/categories", role: "user", desc: "list categories" },
      { method: "POST", path: "/api/v1/categories", role: "admin", desc: "create category" },
      { method: "PATCH/DELETE", path: "/api/v1/categories/{slug}", role: "admin", desc: "update / delete" },
    ],
  },
  {
    group: "dashboards",
    endpoints: [
      { method: "GET", path: "/api/v1/dashboards", role: "user", desc: "list (scoped to access)" },
      { method: "POST", path: "/api/v1/dashboards", role: "admin", desc: "create" },
      { method: "GET", path: "/api/v1/dashboards/{slug}", role: "public*", desc: "get (public if dashboard is public)" },
      { method: "PATCH", path: "/api/v1/dashboards/{slug}", role: "editor", desc: "update settings/toggles/layout" },
      { method: "PUT", path: "/api/v1/dashboards/{slug}/items", role: "editor", desc: "set ordered items" },
      { method: "POST", path: "/api/v1/dashboards/{slug}/slug", role: "editor", desc: "regenerate URL" },
      { method: "GET", path: "/api/v1/dashboards/{slug}/live", role: "public*", desc: "live probe + widget snapshot" },
    ],
  },
  {
    group: "probes & stats",
    endpoints: [
      { method: "GET", path: "/api/v1/probes", role: "user", desc: "all probe states" },
      { method: "GET", path: "/api/v1/probes/{kind}/{slug}", role: "user", desc: "one probe state" },
      { method: "GET", path: "/api/v1/stats/{source}", role: "user", desc: "beszel | uptime | openrouter snapshot" },
    ],
  },
  {
    group: "admin",
    endpoints: [
      { method: "GET/POST", path: "/api/v1/users", role: "superuser", desc: "list / create users" },
      { method: "PATCH", path: "/api/v1/users/{id}", role: "superuser", desc: "role / disable" },
      { method: "GET/POST", path: "/api/v1/api-keys", role: "superuser", desc: "list / issue keys" },
      { method: "DELETE", path: "/api/v1/api-keys/{id}", role: "superuser", desc: "revoke key" },
    ],
  },
  {
    group: "meta",
    endpoints: [
      { method: "GET", path: "/api/v1/openapi.json", role: "public", desc: "OpenAPI 3.1 spec" },
      { method: "GET", path: "/api/health", role: "public", desc: "health check (Docker)" },
      { method: "POST", path: "/mcp", role: "any key", desc: "MCP server (Streamable HTTP) — 24 tools" },
    ],
  },
];

export type McpTool = { name: string; role: string; desc: string };
export const MCP_TOOLS: McpTool[] = [
  { name: "list_services / list_servers / list_external_services", role: "user", desc: "list content with filters" },
  { name: "get_service / get_server / get_external_service", role: "user", desc: "get one incl. body + file hash" },
  { name: "create_service / create_server / create_external_service", role: "admin", desc: "create a markdown record" },
  { name: "update_service / update_server / update_external_service", role: "admin", desc: "merge-update (expectedHash)" },
  { name: "delete_service / delete_server / delete_external_service", role: "admin", desc: "move to trash (confirm:true)" },
  { name: "list_categories", role: "user", desc: "list categories" },
  { name: "upsert_category", role: "admin", desc: "create/update a category" },
  { name: "list_dashboards", role: "user", desc: "list dashboards" },
  { name: "add_item_to_dashboard", role: "admin", desc: "place an item on a dashboard" },
  { name: "remove_item_from_dashboard", role: "admin", desc: "remove an item from a dashboard" },
  { name: "get_probe_status", role: "user", desc: "current up/down + uptime" },
  { name: "validate_markdown", role: "user", desc: "validate without saving" },
  { name: "get_machine_stats", role: "user", desc: "Beszel snapshot" },
  { name: "get_uptime", role: "user", desc: "Uptime Kuma snapshot" },
  { name: "get_openrouter_usage", role: "user", desc: "OpenRouter spend" },
];
