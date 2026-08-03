const IMPORT_START = /^\s*import\b/;
const STATEMENT_END = /;\s*$/;
const LEADING_WHITESPACE = /^\s*/;
const DIRECTIVE_OR_BLANK = /^\s*(?:["']use [a-z ]+["'];?)?\s*$/;
const MODULE_SPECIFIER = /from\s+["']([^"']+)["']/;

export type InjectionAnchor =
  /** Insert the snippet on its own line just before the token. */
  | { kind: "before"; token: string }
  /** Replace the token with a fragment holding the token and the snippet. */
  | { kind: "wrap"; token: string };

export interface InjectionResult {
  changed: boolean;
  code: string;
  reason?: "already-installed" | "no-anchor";
}

function indentOf(line: string): string {
  return LEADING_WHITESPACE.exec(line)?.[0] ?? "";
}

function importInsertIndex(lines: string[]): number {
  let lastImportEnd = -1;
  let insideImport = false;

  for (const [index, line] of lines.entries()) {
    if (!insideImport && IMPORT_START.test(line)) {
      insideImport = true;
    }
    if (insideImport && STATEMENT_END.test(line)) {
      insideImport = false;
      lastImportEnd = index;
    }
  }

  if (lastImportEnd >= 0) {
    return lastImportEnd + 1;
  }

  let index = 0;
  while (index < lines.length && DIRECTIVE_OR_BLANK.test(lines[index] ?? "")) {
    index++;
  }
  return index;
}

function wrapInFragment(
  line: string,
  token: string,
  snippet: string
): string[] {
  const indent = indentOf(line);
  const bareReturn = line.trim() === `return ${token};`;

  if (bareReturn) {
    return [
      `${indent}return (`,
      `${indent}  <>`,
      `${indent}    ${token}`,
      `${indent}    ${snippet}`,
      `${indent}  </>`,
      `${indent});`,
    ];
  }

  const [head, ...tail] = line.split(token);
  const replacement = [
    `${head ?? ""}<>`,
    `${indent}  ${token}`,
    `${indent}  ${snippet}`,
    `${indent}</>${tail.join(token)}`,
  ];
  return replacement;
}

/**
 * Adds the widget to a React entry file with plain text surgery.
 *
 * Deliberately conservative: without a known anchor it changes nothing and
 * says so, so the CLI can fall back to printing the snippet rather than
 * leaving a half-edited file behind.
 */
export function injectWidget(
  source: string,
  options: {
    anchor: InjectionAnchor;
    importLine: string;
    snippet: string;
  }
): InjectionResult {
  const specifier = MODULE_SPECIFIER.exec(options.importLine)?.[1];
  if (specifier && source.includes(specifier)) {
    return { changed: false, code: source, reason: "already-installed" };
  }

  const lines = source.split("\n");
  const anchorIndex = lines.findIndex((line) =>
    line.includes(options.anchor.token)
  );
  const anchorLine = lines[anchorIndex];

  if (anchorIndex === -1 || anchorLine === undefined) {
    return { changed: false, code: source, reason: "no-anchor" };
  }

  if (options.anchor.kind === "before") {
    const indent = indentOf(anchorLine);
    const [head, ...tail] = anchorLine.split(options.anchor.token);
    const inlineHead = head ?? "";

    // `<body>{children}</body>` on one line: split it so the widget lands
    // inside the element instead of next to it.
    const replacement =
      inlineHead.trim() === ""
        ? [`${indent}  ${options.snippet}`, anchorLine]
        : [
            inlineHead,
            `${indent}  ${options.snippet}`,
            `${indent}${options.anchor.token}${tail.join(options.anchor.token)}`,
          ];

    lines.splice(anchorIndex, 1, ...replacement);
  } else {
    lines.splice(
      anchorIndex,
      1,
      ...wrapInFragment(anchorLine, options.anchor.token, options.snippet)
    );
  }

  lines.splice(importInsertIndex(lines), 0, options.importLine);

  return { changed: true, code: lines.join("\n") };
}
