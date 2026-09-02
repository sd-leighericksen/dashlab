import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceSchema } from "@/lib/content/schemas/service";
import { serverSchema } from "@/lib/content/schemas/server";
import { externalSchema } from "@/lib/content/schemas/external";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const j = (s: z.ZodType) => z.toJSONSchema(s, { target: "draft-2020-12" });

export function GET() {
  const base = process.env.PUBLIC_URL ?? "";
  const contentPaths = (seg: string, name: string) => ({
    [`/api/v1/${seg}`]: {
      get: { summary: `List ${name}`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" } } },
      post: { summary: `Create ${name}`, security: [{ bearerAuth: [] }], responses: { "201": { description: "created" } } },
    },
    [`/api/v1/${seg}/{slug}`]: {
      get: { summary: `Get ${name}`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" }, "404": { description: "not found" } } },
      put: { summary: `Replace ${name}`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" }, "412": { description: "etag mismatch" } } },
      patch: { summary: `Merge-update ${name}`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" } } },
      delete: { summary: `Delete ${name}`, security: [{ bearerAuth: [] }], responses: { "204": { description: "deleted" } } },
    },
    [`/api/v1/${seg}/{slug}/raw`]: {
      get: { summary: `Raw markdown`, security: [{ bearerAuth: [] }], responses: { "200": { description: "text/markdown" } } },
      put: { summary: `Write raw markdown`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" } } },
    },
    [`/api/v1/${seg}/{slug}/rename`]: {
      post: { summary: `Rename ${name}`, security: [{ bearerAuth: [] }], responses: { "200": { description: "ok" } } },
    },
  });

  const doc = {
    openapi: "3.1.0",
    info: { title: "dashlab API", version: "1.0.0", description: "Homelab dashboard content + dashboards API." },
    servers: [{ url: base || "/" }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "dl_ API key" } },
      schemas: {
        ServiceFrontmatter: j(serviceSchema),
        ServerFrontmatter: j(serverSchema),
        ExternalFrontmatter: j(externalSchema),
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      ...contentPaths("services", "services"),
      ...contentPaths("servers", "servers"),
      ...contentPaths("external-services", "external services"),
      "/api/v1/validate": { post: { summary: "Validate markdown without saving", responses: { "200": { description: "ok" } } } },
      "/api/v1/categories": { get: { summary: "List categories" }, post: { summary: "Create category" } },
      "/api/v1/dashboards": { get: { summary: "List dashboards" }, post: { summary: "Create dashboard" } },
      "/api/v1/dashboards/{slug}": { get: { summary: "Get dashboard" }, patch: { summary: "Update dashboard" } },
      "/api/v1/dashboards/{slug}/items": { put: { summary: "Set dashboard items (ordered)" } },
      "/api/v1/dashboards/{slug}/slug": { post: { summary: "Regenerate dashboard URL" } },
      "/api/v1/dashboards/{slug}/live": { get: { summary: "Live probe + widget snapshot" } },
      "/api/v1/probes": { get: { summary: "All probe states" } },
      "/api/v1/users": { get: { summary: "List users (superuser)" }, post: { summary: "Create user (superuser)" } },
      "/api/v1/api-keys": { get: { summary: "List API keys (superuser)" }, post: { summary: "Issue API key (superuser)" } },
      "/api/health": { get: { summary: "Health check", security: [] } },
    },
  };
  return NextResponse.json(doc);
}
