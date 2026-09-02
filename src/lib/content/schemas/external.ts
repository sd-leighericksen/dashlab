import { z } from "zod";
import { baseFields, httpUrl } from "./common";

export const externalSchema = z.looseObject({
  ...baseFields,
  type: z
    .enum(["saas", "api", "hosting", "domain", "dns", "cdn", "backup", "ai", "other"])
    .default("other"),
  provider: z.string().max(120).optional(),
  status: z
    .enum(["active", "trial", "testing", "paused", "cancelled"])
    .default("active"),
  url: httpUrl.optional(),
  docs_url: httpUrl.optional(),
  billing: z
    .looseObject({
      monthly_cost: z.number().nonnegative().default(0),
      currency: z.string().length(3).default("AUD"),
      cycle: z.enum(["monthly", "yearly", "usage", "free"]).default("monthly"),
      renews_on: z.iso.date().optional(),
    })
    .optional(),
  purpose: z.string().max(200).optional(),
});

export type ExternalFrontmatter = z.infer<typeof externalSchema>;
