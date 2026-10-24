import { type Fiber, isFiber } from "bippy";
import { getRawSource, getSource, isSourceFile } from "bippy/source";
import { getFiberFromNode, ownerName } from "../../feedback/core/react-source";
import { SERVER_FRAME_ORIGIN } from "../protocol";
import { renderedBox } from "./find-on-page";
import type { SourceRequest } from "./route/dev-route";

const MAX_OWNER_DEPTH = 64;
const DEPENDENCY_FILE = /[\\/]node_modules[\\/]|^node_modules[\\/]/;
const ROOTED_OR_BUNDLER_NAME = /^(?:\/|\[|[a-z][\w+.-]*:)/i;

/** One place in the app's code on the way from a picked element up to the root. */
export interface CodeFrame {
  /** Whose code holds the JSX; null for the root render call. */
  component: string | null;
  /** What that JSX draws on the page. */
  node: Element | null;
  request: SourceRequest;
}

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

const SERVER_CREATION_FRAME = new RegExp(
  String.raw`\((${SERVER_FRAME_ORIGIN}[^\s)]+):(\d+):(\d+)\)`
);

/** The browser cannot map these; the dev route reads the server chunk's map from disk. */
function serverCreationSite(debugStack: unknown): SourceRequest | null {
  const stack = debugStack instanceof Error ? debugStack.stack : undefined;
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

/** A Server Component has no fiber on the client, only the debug info React keeps for it. */
function serverComponentField(
  creation: unknown,
  field: "debugStack" | "owner"
) {
  return typeof creation === "object" && creation !== null
    ? Reflect.get(creation, field)
    : null;
}

async function clientCreationSite(fiber: Fiber): Promise<SourceRequest | null> {
  // React 19 stacks only pin JSX written during a render (bippy guesses from definitions otherwise).
  const hasCreationRecord =
    Boolean(fiber._debugSource) ||
    Boolean(fiber._debugStack && fiber._debugOwner);
  if (!hasCreationRecord) {
    return null;
  }
  const source = await getSource(fiber).catch(() => null);
  const isAppSource =
    source !== null &&
    isSourceFile(source.fileName) &&
    !DEPENDENCY_FILE.test(source.fileName);
  if (!isAppSource) {
    return null;
  }
  return {
    column: source.columnNumber ?? null,
    fileName: resolveAgainstModule(
      source.fileName,
      getRawSource(fiber)?.fileName
    ),
    line: source.lineNumber ?? null,
  };
}

/** Where the JSX that made it is written, when that is the app's own code. */
async function creationSite(creation: unknown): Promise<SourceRequest | null> {
  if (!isFiber(creation)) {
    return serverCreationSite(serverComponentField(creation, "debugStack"));
  }
  return (
    serverCreationSite(creation._debugStack) ??
    (await clientCreationSite(creation))
  );
}

interface DrawnStep {
  fiber: Fiber;
  /** The outermost DOM node this fiber draws on the way down to the picked element. */
  node: Element | null;
}

function drawnPath(hostFiber: Fiber): DrawnStep[] {
  const path: DrawnStep[] = [];
  let node: Element | null = null;
  for (let fiber: Fiber | null = hostFiber; fiber; fiber = fiber.return) {
    if (fiber.stateNode instanceof Element) {
      node = fiber.stateNode;
    }
    path.push({ fiber, node });
  }
  return path;
}

function drawnBy(creation: unknown, path: DrawnStep[]): Element | null {
  if (isFiber(creation)) {
    const step = path.find(
      ({ fiber }) => fiber === creation || fiber.alternate === creation
    );
    return step?.node ?? null;
  }
  let outermost: DrawnStep | null = null;
  for (const step of path) {
    if (step.fiber._debugOwner === creation) {
      outermost = step;
    }
  }
  return outermost?.node ?? null;
}

/**
 * From the picked element up through each component that wrote it, innermost
 * first: where the element is written, where that component is used, and so
 * on. Steps written by libraries are passed over.
 */
export async function* traceElementSource(
  element: Element
): AsyncGenerator<CodeFrame> {
  const hostFiber = getFiberFromNode(element);
  if (!isFiber(hostFiber)) {
    return;
  }
  const path = drawnPath(hostFiber);
  let creation: unknown = hostFiber;
  let node = element;
  for (let depth = 0; creation && depth < MAX_OWNER_DEPTH; depth++) {
    node = drawnBy(creation, path) ?? node;
    const owner = isFiber(creation)
      ? creation._debugOwner
      : serverComponentField(creation, "owner");
    const request = await creationSite(creation);
    if (request) {
      yield { component: ownerName(owner), node: renderedBox(node), request };
    }
    creation = owner;
  }
}

/** Where the picked element itself is written. */
export async function locateElementSource(
  element: Element
): Promise<SourceRequest | null> {
  const first = await traceElementSource(element).next();
  return first.done ? null : first.value.request;
}
