const FIBER_KEY_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"];
const MEMO_TYPE = Symbol.for("react.memo");
const FORWARD_REF_TYPE = Symbol.for("react.forward_ref");

const MAX_STACK_DEPTH = 6;
const MAX_FIBER_WALK = 60;
const MAX_OWNER_WALK = 8;

const ORIGIN_PREFIX = /^[a-z][\w+.-]*:\/\/[^/]*/i;
const WEBPACK_PREFIX = /^webpack-internal:\/{2,}(\.\/)?/;
const STACK_LOCATION = /([^\s()]+):(\d+):(\d+)\)?\s*$/;
const NON_SOURCE_FRAME =
  /node_modules|\/_next\/|\/chunks?\/|\/\.vite\/|\/dist\/|\/build\/|hot-update/;
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;
const SOURCE_ROOT_MARKERS = [
  "src",
  "app",
  "pages",
  "components",
  "features",
  "lib",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** React attaches the fiber under a randomly suffixed key on the host node. */
export function getFiberFromNode(node: Node): unknown {
  for (const key of Object.getOwnPropertyNames(node)) {
    for (const prefix of FIBER_KEY_PREFIXES) {
      if (key.startsWith(prefix)) {
        return Reflect.get(node, key) ?? null;
      }
    }
  }
  return null;
}

function readName(value: unknown): string | null {
  if (typeof value !== "function" && !isRecord(value)) {
    return null;
  }

  const displayName = Reflect.get(value, "displayName");
  if (typeof displayName === "string" && displayName) {
    return displayName;
  }

  const name = Reflect.get(value, "name");
  return typeof name === "string" && name ? name : null;
}

function componentName(type: unknown, depth = 0): string | null {
  if (typeof type === "string" || type === null || depth > 3) {
    return null;
  }

  if (isRecord(type)) {
    const marker = Reflect.get(type, "$$typeof");
    if (marker === MEMO_TYPE) {
      return componentName(Reflect.get(type, "type"), depth + 1);
    }
    if (marker === FORWARD_REF_TYPE) {
      return componentName(Reflect.get(type, "render"), depth + 1);
    }
  }

  const name = readName(type);
  if (!name || name.length < 2) {
    return null;
  }

  const isMeaningful = name[0] === name[0]?.toUpperCase() || name.includes("/");
  return isMeaningful ? name : null;
}

/** Component names owning the fiber, innermost first. */
export function resolveComponentStack(fiber: unknown): string[] {
  const stack: string[] = [];
  let current = fiber;
  let steps = 0;

  while (isRecord(current) && steps < MAX_FIBER_WALK) {
    const name =
      componentName(Reflect.get(current, "type")) ??
      componentName(Reflect.get(current, "elementType"));

    if (name && stack.at(-1) !== name) {
      stack.push(name);
      if (stack.length >= MAX_STACK_DEPTH) {
        break;
      }
    }

    current = Reflect.get(current, "return");
    steps++;
  }

  return stack;
}

function shortenSourcePath(raw: string): string {
  const path = raw
    .replace(WEBPACK_PREFIX, "")
    .replace(ORIGIN_PREFIX, "")
    .split("?")[0];
  if (!path) {
    return raw;
  }

  for (const marker of SOURCE_ROOT_MARKERS) {
    if (path.startsWith(`${marker}/`)) {
      return path;
    }
    const index = path.lastIndexOf(`/${marker}/`);
    if (index !== -1) {
      return path.slice(index + 1);
    }
  }

  return path.split("/").filter(Boolean).slice(-3).join("/");
}

function formatLocation(
  fileName: string,
  line: number,
  column?: number
): string {
  const base = `${shortenSourcePath(fileName)}:${line}`;
  return column === undefined ? base : `${base}:${column}`;
}

function fromDebugSource(source: unknown): string | undefined {
  if (!isRecord(source)) {
    return;
  }

  const fileName = Reflect.get(source, "fileName");
  const lineNumber = Reflect.get(source, "lineNumber");
  if (typeof fileName !== "string" || typeof lineNumber !== "number") {
    return;
  }

  const columnNumber = Reflect.get(source, "columnNumber");
  return formatLocation(
    fileName,
    lineNumber,
    typeof columnNumber === "number" ? columnNumber : undefined
  );
}

function fromDebugStack(stack: unknown): string | undefined {
  const raw = isRecord(stack) ? Reflect.get(stack, "stack") : stack;
  if (typeof raw !== "string") {
    return;
  }

  for (const line of raw.split("\n")) {
    const match = STACK_LOCATION.exec(line);
    const file = match?.[1];
    if (!(match && file) || NON_SOURCE_FRAME.test(file)) {
      continue;
    }

    const path = file.replace(ORIGIN_PREFIX, "").split("?")[0] ?? "";
    if (!SOURCE_EXTENSION.test(path)) {
      continue;
    }

    return formatLocation(path, Number(match[2]), Number(match[3]));
  }
}

/**
 * `src/components/login-form.tsx:46:19` when the React build exposes it.
 * Production bundles strip debug info — callers must treat this as optional.
 */
export function resolveSourceLocation(fiber: unknown): string | undefined {
  let current = fiber;
  let steps = 0;

  while (isRecord(current) && steps < MAX_OWNER_WALK) {
    const located =
      fromDebugSource(Reflect.get(current, "_debugSource")) ??
      fromDebugStack(Reflect.get(current, "_debugStack"));
    if (located) {
      return located;
    }

    current = Reflect.get(current, "_debugOwner");
    steps++;
  }
}

export function inspectReactElement(element: Element): {
  componentStack: string[];
  sourceLocation?: string;
} {
  const fiber = getFiberFromNode(element);
  return {
    componentStack: resolveComponentStack(fiber),
    sourceLocation: resolveSourceLocation(fiber),
  };
}
