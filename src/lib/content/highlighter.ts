import "server-only";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const g = globalThis as { __dashlabHl?: Promise<HighlighterCore> };

export function getHighlighter(): Promise<HighlighterCore> {
  if (!g.__dashlabHl) {
    g.__dashlabHl = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        import("@shikijs/themes/github-light"),
        import("@shikijs/themes/github-dark"),
      ],
      langs: [
        import("@shikijs/langs/bash"),
        import("@shikijs/langs/shellscript"),
        import("@shikijs/langs/yaml"),
        import("@shikijs/langs/json"),
        import("@shikijs/langs/dockerfile"),
        import("@shikijs/langs/ini"),
        import("@shikijs/langs/nginx"),
        import("@shikijs/langs/toml"),
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/python"),
        import("@shikijs/langs/sql"),
        import("@shikijs/langs/diff"),
      ],
    });
  }
  return g.__dashlabHl;
}
