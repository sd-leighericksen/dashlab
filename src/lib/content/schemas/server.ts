import { z } from "zod";
import { baseFields, httpUrl, probe } from "./common";

export const serverSchema = z.looseObject({
  ...baseFields,
  status: z
    .enum(["active", "offline", "maintenance", "retired", "planned"])
    .default("active"),
  hostname: z.string().max(253).optional(),
  ips: z
    .looseObject({
      internal: z.ipv4().optional(),
      tailscale: z.ipv4().optional(),
    })
    .default({}),
  ssh: z
    .looseObject({
      port: z.int().min(1).max(65535).default(22),
      user: z.string().max(64).optional(),
    })
    .optional(),
  hardware: z
    .looseObject({
      brand: z.string().optional(),
      model: z.string().optional(),
      cpu: z.string().optional(),
      ram_gb: z.number().nonnegative().optional(),
      storage: z.string().optional(),
    })
    .optional(),
  os: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  purpose: z.string().max(200).optional(),
  tech_stack: z.string().max(500).optional(),
  urls: z
    .looseObject({
      domain: httpUrl.optional(),
      tailscale: httpUrl.optional(),
      local: httpUrl.optional(),
    })
    .default({}),
  probe,
  monitors: z
    .looseObject({
      beszel_system: z.string().nullable().optional(),
      uptime_kuma: z.union([z.int(), z.string()]).nullable().optional(),
    })
    .optional(),
});

export type ServerFrontmatter = z.infer<typeof serverSchema>;
