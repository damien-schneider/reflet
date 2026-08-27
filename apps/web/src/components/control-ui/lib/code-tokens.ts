import type { HighlighterCore, ThemedToken } from "shiki/core";

// shared Shiki tokenizer for code primitives (Code, CodeDiff, CodeBlockEditor, Markdown) — CSS-var theme
// (not baked github-light/dark), tokens resolve `var(--code-token-*)`, revalued by active color scope in code.css
// pure+isomorphic (RSC awaits, client highlights in effect); LRU cache (lang\ncode) keeps re-highlight cheap; null = unknown lang

export type CodeTokenStyle = {
  color?: string;
  fontStyle?: "italic" | "normal";
  fontWeight?: "bold" | "normal";
  textDecoration?: "underline";
};

export type CodeToken = { content: string; style?: CodeTokenStyle };
export type CodeTokenLine = CodeToken[];
export type CodeTokenLines = CodeTokenLine[];
export type CodeEmphasisSegment = { text: string; emphasis: boolean };
export type CodeTokenEmphasisRun = CodeToken & { emphasis: boolean; start: number };

export const CODE_THEME_NAME = "agent-code";
export const CODE_VARIABLE_PREFIX = "--code-";

const languageAliases: Record<string, string> = {
  bash: "bash",
  cjs: "javascript",
  css: "css",
  diff: "diff",
  html: "html",
  js: "javascript",
  json: "json",
  json5: "json",
  jsx: "jsx",
  markdown: "markdown",
  md: "markdown",
  mjs: "javascript",
  node: "javascript",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

// Shiki FontStyle bitmask (Italic = 1, Bold = 2, Underline = 4).
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function normalizeLanguage(language?: string | null): string | undefined {
  if (!language) return undefined;
  return languageAliases[language.toLowerCase()];
}

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] = await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
      ]);

      const theme = createCssVariablesTheme({
        name: CODE_THEME_NAME,
        variablePrefix: CODE_VARIABLE_PREFIX,
        fontStyle: true,
      });

      return createHighlighterCore({
        themes: [theme],
        langs: [
          import("shiki/langs/javascript.mjs"),
          import("shiki/langs/typescript.mjs"),
          import("shiki/langs/tsx.mjs"),
          import("shiki/langs/jsx.mjs"),
          import("shiki/langs/json.mjs"),
          import("shiki/langs/bash.mjs"),
          import("shiki/langs/markdown.mjs"),
          import("shiki/langs/python.mjs"),
          import("shiki/langs/css.mjs"),
          import("shiki/langs/html.mjs"),
          import("shiki/langs/yaml.mjs"),
          import("shiki/langs/diff.mjs"),
        ],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }

  return highlighterPromise;
}

function tokenStyle(token: ThemedToken): CodeTokenStyle | undefined {
  const style: CodeTokenStyle = {};
  if (token.color) style.color = token.color;
  const fontStyle = token.fontStyle ?? 0;
  if (fontStyle > 0) {
    if ((fontStyle & FONT_STYLE_ITALIC) !== 0) style.fontStyle = "italic";
    if ((fontStyle & FONT_STYLE_BOLD) !== 0) style.fontWeight = "bold";
    if ((fontStyle & FONT_STYLE_UNDERLINE) !== 0) style.textDecoration = "underline";
  }
  return style.color || style.fontStyle || style.fontWeight || style.textDecoration ? style : undefined;
}

// Small LRU: streaming/virtualized views re-highlight same code repeatedly.
const CACHE_LIMIT = 200;
const cache = new Map<string, CodeTokenLines | null>();

function cacheGet(key: string): CodeTokenLines | null | undefined {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key); // refresh recency
    cache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: CodeTokenLines | null): void {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

function reconstructs(value: string, parts: readonly string[]): boolean {
  return parts.join("") === value;
}

export function mergeCodeTokenLineWithEmphasis(
  plain: string,
  tokens: CodeTokenLine | null,
  segments: readonly CodeEmphasisSegment[] | undefined,
): CodeTokenEmphasisRun[] {
  const tokenParts = tokens?.filter((token) => token.content.length > 0) ?? [];
  const validTokens = reconstructs(
    plain,
    tokenParts.map((token) => token.content),
  )
    ? tokenParts
    : [{ content: plain }];
  const segmentParts = segments?.filter((segment) => segment.text.length > 0) ?? [];
  const validSegments = reconstructs(
    plain,
    segmentParts.map((segment) => segment.text),
  )
    ? segmentParts
    : [{ text: plain, emphasis: false }];

  if (plain.length === 0) return [];

  const runs: CodeTokenEmphasisRun[] = [];
  let tokenIndex = 0;
  let segmentIndex = 0;
  let tokenOffset = 0;
  let segmentOffset = 0;
  let runStart = 0;

  while (tokenIndex < validTokens.length && segmentIndex < validSegments.length) {
    const token = validTokens[tokenIndex];
    const segment = validSegments[segmentIndex];
    const length = Math.min(token.content.length - tokenOffset, segment.text.length - segmentOffset);
    runs.push({
      start: runStart,
      content: token.content.slice(tokenOffset, tokenOffset + length),
      ...(token.style ? { style: token.style } : {}),
      emphasis: segment.emphasis,
    });
    runStart += length;

    tokenOffset += length;
    segmentOffset += length;
    if (tokenOffset === token.content.length) {
      tokenIndex += 1;
      tokenOffset = 0;
    }
    if (segmentOffset === segment.text.length) {
      segmentIndex += 1;
      segmentOffset = 0;
    }
  }

  return runs;
}

// null for unknown language; memoized by `lang\ncode`
export async function highlightToTokens(code: string, language?: string | null): Promise<CodeTokenLines | null> {
  const lang = normalizeLanguage(language);
  if (!lang) return null;

  const key = `${lang}\n${code}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(code, { lang, theme: CODE_THEME_NAME });
  const lines: CodeTokenLines = tokens.map((line) => line.map((token) => ({ content: token.content, style: tokenStyle(token) })));

  cacheSet(key, lines);
  return lines;
}
