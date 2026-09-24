import { isFiber } from "bippy";
import { getRawSource, getSource, isSourceFile } from "bippy/source";
import { getFiberFromNode } from "../../feedback/core/react-source";
import type { SourceRequest } from "./route/dev-route";

const MAX_FIBER_ASCENT = 12;
const DEPENDENCY_FILE = /[\\/]node_modules[\\/]|^node_modules[\\/]/;
const ROOTED_OR_BUNDLER_NAME = /^(?:\/|\[|[a-z][\w+.-]*:)/i;

/**
 * Vite's maps list sources relative to the served module (`main.tsx` for
 * `/src/main.tsx`) and bippy hands them back as-is.
 */
function resolveAgainstModule(fileName: string, moduleUrl: string | undefined) {
  if (!moduleUrl || ROOTED_OR_BUNDLER_NAME.test(fileName)) {
    return fileName;
  }
  try {
    return new URL(fileName, moduleUrl).pathname;
  } catch {
    return fileName;
  }
}

const SERVER_CREATION_FRAME =
  /\(((?:about|rsc):\/\/React\/Server\/[^\s)]+):(\d+):(\d+)\)/;

/** The browser cannot map these; the dev route reads the server chunk's map from disk. */
function serverCreationSite(fiber: {
  _debugStack?: unknown;
}): SourceRequest | null {
  const stack =
    fiber._debugStack instanceof Error ? fiber._debugStack.stack : undefined;
  const match = stack ? SERVER_CREATION_FRAME.exec(stack) : null;
  if (!match?.[1]) {
    return null;
  }
  return {
    column: Number(match[3]) - 1,
    fileName: match[1],
    line: Number(match[2]),
  };
}

/** Source-mapped through the dev server: React's own debug stacks point at bundled chunks. */
export async function locateElementSource(
  element: Element
): Promise<SourceRequest | null> {
  const hostFiber = getFiberFromNode(element);
  let fiber = isFiber(hostFiber) ? hostFiber : null;
  for (let depth = 0; fiber && depth < MAX_FIBER_ASCENT; depth++) {
    const serverSite = serverCreationSite(fiber);
    if (serverSite) {
      return serverSite;
    }
    const source = await getSource(fiber).catch(() => null);
    if (
      source &&
      isSourceFile(source.fileName) &&
      !DEPENDENCY_FILE.test(source.fileName)
    ) {
      return {
        column: source.columnNumber ?? null,
        fileName: resolveAgainstModule(
          source.fileName,
          getRawSource(fiber)?.fileName
        ),
        line: source.lineNumber ?? null,
      };
    }
    fiber = fiber.return;
  }
  return null;
}
