import { z } from "zod";
import { baseFields, httpUrl } from "./common";

export const bookmarkSchema = z.looseObject({
  ...baseFields,
  url: httpUrl,
});

export type BookmarkFrontmatter = z.infer<typeof bookmarkSchema>;
