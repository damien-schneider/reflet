import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, sep } from "node:path";
import type { SourceFile } from "../../protocol";
import { type DevtoolsOutcome, failure } from "../json-response";
import { jsxElementLines } from "./jsx-range";
import type { ProjectRoots } from "./project-roots";
import { isServerFrame, mapServerFrame } from "./server-frame";

const MAX_SOURCE_BYTES = 1_048_576;
const MAX_FILE_NAME_LENGTH = 2048;
const MAX_NORMALIZE_PASSES = 8;
const SOURCE_EXTENSIONS = [
  ".astro",
  ".cjs",
  ".js",
  ".jsx",
  ".mdx",
  ".mjs",
  ".svelte",
  ".ts",
  ".tsx",
  ".vue",
];
const EXTENSION_REFUSAL = `Reflet devtools only reads source files (${SOURCE_EXTENSIONS.join(", ")}).`;
const OUTSIDE_WORKSPACE_REFUSAL =
  "Reflet devtools only reads files inside your repository.";
const NODE_MODULES_REFUSAL =
  "Reflet devtools does not read files inside node_modules.";
const QUERY_OR_HASH = /[?#].*$/;
const TURBOPACK_MODULE_SUFFIX = /(?: \[[\w-]+\])+(?: \([\w-]+\))*$/;
const URL_PREFIXES = [/^file:\/\//, /^https?:\/\/[^/]*/];
const BUNDLER_PREFIXES = [
  /^rsc:\/\/React\/[^/]+\//,
  /^webpack-internal:\/{2,}/,
  /^webpack:\/\/[^/]*\//,
  /^turbopack:\/{2,}/,
  /^\[project\]\//,
  /^\(app-pages-browser\)\//,
  /^\([\w-]+\)\/(?=\.\/)/,
  /^\/@fs(?=\/)/,
  /^\.\//,
];

interface LocatedFile {
  realPath: string;
  relativePath: string;
  size: number;
}

type CandidateCheck =
  | ({ kind: "found" } & LocatedFile)
  | { kind: "missing" }
  | { kind: "refused"; reason: string };

export interface SourceRequest {
  column: number | null;
  fileName: string;
  line: number | null;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function stripFirstPrefix(fileName: string, prefixes: RegExp[]): string {
  for (const prefix of prefixes) {
    if (prefix.test(fileName)) {
      return fileName.replace(prefix, "");
    }
  }
  return fileName;
}

/** Turns a file name from a React debug stack into a filesystem path. */
export function normalizeSourceFileName(rawFileName: string): string {
  let fileName = rawFileName
    .trim()
    .replace(QUERY_OR_HASH, "")
    .replace(TURBOPACK_MODULE_SUFFIX, "");
  let isUrlEncoded = false;

  for (let pass = 0; pass < MAX_NORMALIZE_PASSES; pass += 1) {
    const withoutUrl = stripFirstPrefix(fileName, URL_PREFIXES);
    isUrlEncoded ||= withoutUrl !== fileName;
    const stripped = stripFirstPrefix(withoutUrl, BUNDLER_PREFIXES);
    if (stripped === fileName) {
      break;
    }
    fileName = stripped;
  }

  return isUrlEncoded ? decodePath(fileName) : fileName;
}

function candidatePaths(fileName: string, roots: ProjectRoots): string[] {
  const candidates = [
    join(roots.root, fileName),
    join(roots.workspaceRoot, fileName),
  ];
  if (isAbsolute(fileName)) {
    candidates.unshift(fileName);
  }
  return [...new Set(candidates)];
}

function isSourceExtension(path: string): boolean {
  return SOURCE_EXTENSIONS.includes(extname(path).toLowerCase());
}

function workspaceRelativePath(
  realPath: string,
  workspaceRoot: string
): string | null {
  const relativePath = relative(workspaceRoot, realPath);
  const escapes =
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath);
  return escapes ? null : relativePath.split(sep).join("/");
}

async function checkCandidate(
  candidate: string,
  workspaceRoot: string
): Promise<CandidateCheck> {
  let realPath: string;
  let size: number;
  try {
    realPath = await realpath(candidate);
    const stats = await stat(realPath);
    if (!stats.isFile()) {
      return { kind: "missing" };
    }
    size = stats.size;
  } catch {
    return { kind: "missing" };
  }

  const relativePath = workspaceRelativePath(realPath, workspaceRoot);
  if (relativePath === null) {
    return { kind: "refused", reason: OUTSIDE_WORKSPACE_REFUSAL };
  }
  if (relativePath.split("/").includes("node_modules")) {
    return { kind: "refused", reason: NODE_MODULES_REFUSAL };
  }
  if (!isSourceExtension(realPath)) {
    return { kind: "refused", reason: EXTENSION_REFUSAL };
  }
  return { kind: "found", realPath, relativePath, size };
}

async function locateSourceFile(
  fileName: string,
  roots: ProjectRoots
): Promise<DevtoolsOutcome<LocatedFile>> {
  let refusal: string | null = null;
  for (const candidate of candidatePaths(fileName, roots)) {
    const check = await checkCandidate(candidate, roots.workspaceRoot);
    if (check.kind === "found") {
      return { ok: true, value: check };
    }
    if (check.kind === "refused") {
      refusal ??= check.reason;
    }
  }
  if (refusal) {
    return failure(refusal, 403);
  }
  return failure(`Could not find ${fileName} in ${roots.workspaceRoot}.`, 404);
}

/** Server-map columns can point past the line; the element then starts at its first tag. */
function columnWithinLine(code: string, line: number, column: number | null) {
  const text = code.split("\n")[line - 1] ?? "";
  return column !== null && column < text.length ? column : null;
}

export async function readSourceFile(
  frame: SourceRequest,
  roots: ProjectRoots
): Promise<DevtoolsOutcome<SourceFile>> {
  if (
    frame.fileName.length > MAX_FILE_NAME_LENGTH ||
    frame.fileName.includes("\0")
  ) {
    return failure("That source file name is not a valid path.", 400);
  }
  const mapped = isServerFrame(frame.fileName)
    ? await mapServerFrame(frame, roots.workspaceRoot)
    : { ok: true as const, value: frame };
  if (!mapped.ok) {
    return mapped;
  }
  const request = mapped.value;
  const fileName = normalizeSourceFileName(request.fileName);
  if (!fileName) {
    return failure("A source file name is required.", 400);
  }
  if (!isSourceExtension(fileName)) {
    return failure(EXTENSION_REFUSAL, 403);
  }

  const located = await locateSourceFile(fileName, roots);
  if (!located.ok) {
    return located;
  }
  const { realPath, relativePath, size } = located.value;
  if (size > MAX_SOURCE_BYTES) {
    return failure(
      `${relativePath} is larger than 1 MB, too big to preview.`,
      413
    );
  }

  const code = await readFile(realPath, "utf8");
  const column =
    request.line === null
      ? request.column
      : columnWithinLine(code, request.line, request.column);
  const elementLines =
    request.line === null
      ? null
      : jsxElementLines(code, request.line, column ?? 0);

  return {
    ok: true,
    value: {
      absolutePath: realPath,
      code,
      column,
      elementLines,
      line: request.line,
      path: relativePath,
    },
  };
}
