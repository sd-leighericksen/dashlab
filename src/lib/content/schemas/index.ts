import type { ZodType } from "zod";
import type { ContentKindT } from "@/lib/content/kinds";
import { serviceSchema } from "./service";
import { serverSchema } from "./server";
import { externalSchema } from "./external";
import { bookmarkSchema } from "./bookmark";

export * from "./common";
export * from "./service";
export * from "./server";
export * from "./external";
export * from "./bookmark";

export function schemaFor(kind: ContentKindT): ZodType {
  switch (kind) {
    case "service":
      return serviceSchema;
    case "server":
      return serverSchema;
    case "external":
      return externalSchema;
    case "bookmark":
      return bookmarkSchema;
  }
}
