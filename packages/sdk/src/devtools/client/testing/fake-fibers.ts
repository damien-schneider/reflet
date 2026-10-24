const HOST_COMPONENT_TAG = 5;
const FUNCTION_COMPONENT_TAG = 0;

export type FakeFiber = Record<string, unknown>;

export interface FakeServerComponent {
  debugStack: Error;
  name: string;
  owner: FakeServerComponent | null;
}

interface SourceSite {
  column: number;
  fileName: string;
  line: number;
}

export function site(fileName: string, line: number, column = 4): SourceSite {
  return { column, fileName, line };
}

/** The frame React stamps on what a Server Component renders: a position in the dev server's own chunk. */
export function serverStack(chunk: string, line: number, column: number) {
  const stack = new Error("react-stack-top-frame");
  stack.stack = [
    "Error: react-stack-top-frame",
    `    at Page (about://React/Server/file:///repo/.next/server/chunks/ssr/${chunk}:${line}:${column})`,
  ].join("\n");
  return stack;
}

/**
 * A fiber with what React's dev build leaves on it: who created it, where
 * (React 18's `_debugSource`, or a server frame), and its DOM node if any.
 */
export function fakeFiber(spec: {
  createdAt?: SourceSite;
  createdOnServer?: Error;
  node?: Element;
  owner?: unknown;
  parent?: FakeFiber;
  type: unknown;
}): FakeFiber {
  const fiber: FakeFiber = {
    _debugOwner: spec.owner ?? null,
    _debugSource: spec.createdAt && {
      columnNumber: spec.createdAt.column,
      fileName: spec.createdAt.fileName,
      lineNumber: spec.createdAt.line,
    },
    _debugStack: spec.createdOnServer,
    alternate: null,
    child: null,
    elementType: spec.type,
    flags: 0,
    return: spec.parent ?? null,
    sibling: null,
    stateNode: spec.node ?? null,
    tag:
      typeof spec.type === "string"
        ? HOST_COMPONENT_TAG
        : FUNCTION_COMPONENT_TAG,
    type: spec.type,
  };
  if (spec.node) {
    Object.defineProperty(spec.node, "__reactFiber$test", { value: fiber });
  }
  return fiber;
}
