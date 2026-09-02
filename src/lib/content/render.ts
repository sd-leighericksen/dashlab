import "server-only";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolink from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import type { Root, Element } from "hast";
import type { TocEntry } from "@/lib/db/schema/content";
import { getHighlighter } from "./highlighter";

const schema: typeof defaultSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],
    span: [...(defaultSchema.attributes?.span ?? []), "style", "className"],
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
  },
};

function collectToc(toc: TocEntry[]) {
  return () => (tree: Root) => {
    const walk = (node: Root | Element) => {
      for (const child of node.children ?? []) {
        if (child.type === "element") {
          const el = child as Element;
          if (el.tagName === "h2" || el.tagName === "h3") {
            const id = String(el.properties?.id ?? "");
            if (id) toc.push({ depth: el.tagName === "h2" ? 2 : 3, id, text: textOf(el) });
          }
          walk(el);
        }
      }
    };
    walk(tree);
  };
}

function textOf(el: Element): string {
  let out = "";
  for (const c of el.children ?? []) {
    if (c.type === "text") out += c.value;
    else if (c.type === "element" && c.tagName !== "a") out += textOf(c as Element);
  }
  return out.trim();
}

export type RenderResult = { html: string; toc: TocEntry[] };

export async function renderMarkdown(md: string): Promise<RenderResult> {
  const toc: TocEntry[] = [];
  const highlighter = await getHighlighter();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolink, { behavior: "append", content: { type: "text", value: " #" } })
    .use(rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] })
    .use(collectToc(toc))
    .use(rehypeSanitize, schema)
    .use(rehypeShikiFromHighlighter, highlighter, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      fallbackLanguage: "text",
      addLanguageClass: true,
    })
    .use(rehypeStringify)
    .process(md);
  return { html: String(file), toc };
}
