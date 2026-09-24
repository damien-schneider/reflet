import { type ExecFileException, execFile } from "node:child_process";
import { join } from "node:path";
import type { CodeMatch, CodeSearchResult } from "../../protocol";
import { type DevtoolsOutcome, failure } from "../json-response";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;
const MAX_MATCHES = 20;
const PREVIEW_LENGTH = 160;
const PREVIEW_LEAD = 40;
const SEARCH_TIMEOUT_MS = 4000;
const MAX_OUTPUT_BYTES = 1_048_576;
const NO_MATCHES_EXIT_CODE = 1;
const NOT_A_REPOSITORY_EXIT_CODE = 128;
const SEARCHED_FILES = [
  "*.tsx",
  "*.jsx",
  "*.ts",
  "*.js",
  "*.vue",
  "*.svelte",
  "*.astro",
  "*.mdx",
];
const LINE_BREAK = /[\r\n]/;

interface GitGrepRun {
  error: ExecFileException | null;
  stdout: string;
}

function runGitGrep(workspaceRoot: string, query: string): Promise<GitGrepRun> {
  const args = [
    "grep",
    "-n",
    "-z",
    "-I",
    "-F",
    "--no-color",
    "--untracked",
    "-e",
    query,
    "--",
    ...SEARCHED_FILES,
  ];
  return new Promise((resolveRun) => {
    execFile(
      "git",
      args,
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        maxBuffer: MAX_OUTPUT_BYTES,
        timeout: SEARCH_TIMEOUT_MS,
      },
      (error, stdout) => resolveRun({ error, stdout })
    );
  });
}

function previewLine(content: string, query: string): string {
  const text = content.trim();
  if (text.length <= PREVIEW_LENGTH) {
    return text;
  }
  const matchIndex = text.indexOf(query);
  const start = Math.max(
    0,
    Math.min(matchIndex - PREVIEW_LEAD, text.length - PREVIEW_LENGTH)
  );
  const end = start + PREVIEW_LENGTH;
  const head = start > 0 ? "…" : "";
  const tail = end < text.length ? "…" : "";
  return `${head}${text.slice(start, end)}${tail}`;
}

function parseMatches(
  stdout: string,
  workspaceRoot: string,
  query: string
): CodeMatch[] {
  const matches: CodeMatch[] = [];
  for (const record of stdout.split("\n")) {
    const [path, lineText, content] = record.split("\0");
    const line = Number(lineText);
    const isComplete =
      path !== undefined && content !== undefined && Number.isInteger(line);
    if (isComplete && !path.split("/").includes("node_modules")) {
      matches.push({
        absolutePath: join(workspaceRoot, path),
        line,
        path,
        preview: previewLine(content, query),
      });
      if (matches.length === MAX_MATCHES) {
        break;
      }
    }
  }
  return matches;
}

function describeGitFailure(error: ExecFileException): DevtoolsOutcome<never> {
  if (error.code === "ENOENT") {
    return failure("Code search needs git installed on the dev server.", 503);
  }
  if (error.code === NOT_A_REPOSITORY_EXIT_CODE) {
    return failure(
      "Code search needs the app to live in a git repository.",
      503
    );
  }
  if (error.killed) {
    return failure("Code search timed out.", 504);
  }
  return failure(`Code search failed: ${error.message}`, 500);
}

export async function searchCode(
  workspaceRoot: string,
  rawQuery: string
): Promise<DevtoolsOutcome<CodeSearchResult>> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return failure(
      `Search for ${MIN_QUERY_LENGTH} to ${MAX_QUERY_LENGTH} characters.`,
      400
    );
  }
  if (LINE_BREAK.test(query)) {
    return failure("Search for a single line of text.", 400);
  }

  const { error, stdout } = await runGitGrep(workspaceRoot, query);
  const matches = parseMatches(stdout, workspaceRoot, query);
  const hasNoMatches = error?.code === NO_MATCHES_EXIT_CODE;
  if (!error || hasNoMatches || matches.length > 0) {
    return { ok: true, value: { matches } };
  }
  return describeGitFailure(error);
}
