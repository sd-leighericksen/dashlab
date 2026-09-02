import { z } from "zod";

export const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slug = z.string().regex(slugRe, "must be kebab-case").max(64);
export const httpUrl = z.url({ protocol: /^https?$/ });

// "200-399,401" or a single 200
export const statusRange = z
  .string()
  .regex(/^\d{3}(-\d{3})?(,\d{3}(-\d{3})?)*$/, "e.g. 200-399,401");

export const iconRef = z.string().max(200);

export const linkItem = z.object({
  label: z.string().max(60),
  url: httpUrl,
});

export const probeHttp = z.looseObject({
  enabled: z.boolean().default(true),
  type: z.literal("http"),
  target: z.enum(["domain", "tailscale", "local", "url"]).default("local"),
  url: httpUrl.optional(),
  method: z.enum(["GET", "HEAD"]).default("HEAD"),
  path: z.string().startsWith("/").default("/"),
  expect_status: statusRange.default("200-399,401,403"),
  expect_body: z.string().max(200).optional(),
  timeout_ms: z.int().min(500).max(30000).optional(),
  interval_s: z.int().min(15).max(3600).optional(),
  insecure_tls: z.boolean().default(false),
  headers: z.record(z.string(), z.string()).optional(),
});

export const probeTcp = z.looseObject({
  enabled: z.boolean().default(true),
  type: z.literal("tcp"),
  host: z.enum(["domain", "tailscale", "local", "internal", "hostname"]).default("local"),
  port: z.int().min(1).max(65535).optional(),
  timeout_ms: z.int().min(500).max(30000).optional(),
  interval_s: z.int().min(15).max(3600).optional(),
});

export const probeOff = z.looseObject({
  enabled: z.literal(false),
  type: z.enum(["http", "tcp"]).optional(),
});

export const probe = z
  .discriminatedUnion("type", [probeHttp, probeTcp])
  .optional();

export const baseFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(280).optional(),
  category: slug.optional(),
  tags: z.array(slug).default([]),
  icon: iconRef.optional(),
  links: z.array(linkItem).default([]),
  open_in: z.enum(["new_tab", "same_tab", "overlay"]).optional(),
  card_url: httpUrl.optional(),
  hidden: z.boolean().default(false),
};

export type ProbeConfig =
  | z.infer<typeof probeHttp>
  | z.infer<typeof probeTcp>;
