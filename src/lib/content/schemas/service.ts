import { z } from "zod";
import { baseFields, httpUrl, probe, slug } from "./common";

export const serviceSchema = z
  .looseObject({
    ...baseFields,
    status: z
      .enum(["running", "stopped", "paused", "planned", "deprecated", "broken"])
      .default("running"),
    server: slug.optional(),
    urls: z
      .looseObject({
        domain: httpUrl.optional(),
        tailscale: httpUrl.optional(),
        local: httpUrl.optional(),
      })
      .default({}),
    port: z.int().min(1).max(65535).optional(),
    install: z
      .looseObject({
        method: z
          .enum(["docker", "compose", "native", "script", "vm", "lxc", "k8s", "other"])
          .optional(),
        directory: z.string().max(200).optional(),
        image: z.string().max(200).optional(),
        container: z.string().max(100).optional(),
        autostart: z.boolean().optional(),
      })
      .optional(),
    probe,
    monitors: z
      .looseObject({
        uptime_kuma: z.union([z.int(), z.string()]).nullable().optional(),
        beszel: z.string().nullable().optional(),
      })
      .optional(),
  })
  .refine(
    (s) =>
      s.status === "planned" ||
      !!(s.urls.domain || s.urls.tailscale || s.urls.local),
    { path: ["urls"], error: "at least one URL is required unless status is planned" },
  );

export type ServiceFrontmatter = z.infer<typeof serviceSchema>;
