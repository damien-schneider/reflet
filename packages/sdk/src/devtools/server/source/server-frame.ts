import { readFile, realpath, stat } from "node:fs/promises";
import { SourceMap } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { type DevtoolsOutcome, failure } from "../json-response";
import type { SourceRequest } from "./source-file";

const SERVER_FRAME_PREFIX = /^(?:about|rsc):\/\/React\/Server\//;
const QUERY_OR_HASH = /[?#].*$/;
const SOURCE_MAPPING_URL = /\/\/# sourceMappingURL=(\S+)\s*$/;
const MAX_MAP_BYTES = 50 * 1_048_576;

const mapCache = new Map<string, { map: SourceMap; mtimeMs: number }>();

export function isServerFrame(fileName: string): boolean {
  return SERVER_FRAME_PREFIX.test(fileName);
}

function isInside(path: string, root: string): boolean {
  const fromRoot = relative(root, path);
  return (
    fromRoot !== "" &&
    !fromRoot.startsWith("..") &&
    !fromRoot.includes(`..${sep}`)
  );
}

async function mapPathFor(chunkPath: string): Promise<string> {
  const code = await readFile(chunkPath, "utf8");
  const declared = SOURCE_MAPPING_URL.exec(code)?.[1];
  return declared
    ? join(dirname(chunkPath), decodeURIComponent(declared))
    : `${chunkPath}.map`;
}

async function loadMap(mapPath: string): Promise<SourceMap> {
  const { mtimeMs, size } = await stat(mapPath);
  if (size > MAX_MAP_BYTES) {
    throw new Error("source map too large");
  }
  const cached = mapCache.get(mapPath);
  if (cached?.mtimeMs === mtimeMs) {
    return cached.map;
  }
  const map = new SourceMap(JSON.parse(await readFile(mapPath, "utf8")));
  mapCache.set(mapPath, { map, mtimeMs });
  return map;
}

/**
 * Server Components stamp their elements with frames into the dev server's
 * own chunks (`about://React/Server/file:///…/.next/…`); the browser cannot
 * fetch those maps, so they are resolved here from disk.
 */
export async function mapServerFrame(
  request: SourceRequest,
  workspaceRoot: string
): Promise<DevtoolsOutcome<SourceRequest>> {
  const unreadable = failure<SourceRequest>(
    "This element comes from a Server Component whose source map could not be read.",
    404
  );
  if (request.line === null) {
    return unreadable;
  }
  try {
    const chunkUrl = request.fileName
      .replace(SERVER_FRAME_PREFIX, "")
      .replace(QUERY_OR_HASH, "");
    const chunkPath = await realpath(fileURLToPath(chunkUrl));
    if (!isInside(chunkPath, workspaceRoot)) {
      return failure<SourceRequest>(
        "Reflet devtools only reads files inside your repository.",
        403
      );
    }
    const map = await loadMap(await mapPathFor(chunkPath));
    const origin = map.findOrigin(request.line, (request.column ?? 0) + 1);
    if (!("fileName" in origin)) {
      return unreadable;
    }
    return {
      ok: true,
      value: {
        column: origin.columnNumber - 1,
        fileName: origin.fileName,
        line: origin.lineNumber,
      },
    };
  } catch {
    return unreadable;
  }
}
