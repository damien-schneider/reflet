import type { ConsoleEvent } from "../../types";

const DEFAULT_LIMIT = 30;
const MAX_MESSAGE_LENGTH = 1000;
const RECORDED_METHODS = ["error", "warn"] as const;

type RecordedMethod = (typeof RECORDED_METHODS)[number];

export interface ConsoleRecorder {
  events: () => ConsoleEvent[];
  stop: () => void;
}

function serializeArgument(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value) ?? "[unserializable]";
    } catch {
      return "[unserializable]";
    }
  }
  if (typeof value === "function") {
    return "[function]";
  }
  return String(value);
}

function formatMessage(args: unknown[]): string {
  const message = args.map(serializeArgument).join(" ");
  return message.length > MAX_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
    : message;
}

/**
 * Buffers the console noise a user saw right before reporting a bug.
 * Wrappers delegate to the previous implementation, so nothing is swallowed.
 */
export function startConsoleRecorder(options?: {
  limit?: number;
}): ConsoleRecorder {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const buffer: ConsoleEvent[] = [];
  let active = true;

  const push = (level: ConsoleEvent["level"], message: string) => {
    if (!(active && message)) {
      return;
    }
    buffer.push({ level, message, timestamp: Date.now() });
    if (buffer.length > limit) {
      buffer.splice(0, buffer.length - limit);
    }
  };

  const originals = new Map<RecordedMethod, (...args: unknown[]) => void>();
  const wrappers = new Map<RecordedMethod, (...args: unknown[]) => void>();

  for (const method of RECORDED_METHODS) {
    const original = console[method];
    const wrapper = (...args: unknown[]) => {
      push(method, formatMessage(args));
      Reflect.apply(original, console, args);
    };
    originals.set(method, original);
    wrappers.set(method, wrapper);
    console[method] = wrapper;
  }

  const onError = (event: ErrorEvent) => {
    const where = event.filename
      ? ` (${event.filename}:${event.lineno}:${event.colno})`
      : "";
    push("error", `${event.message}${where}`);
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    push("error", `Unhandled rejection: ${serializeArgument(event.reason)}`);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return {
    events: () => buffer.slice(),
    stop: () => {
      if (!active) {
        return;
      }
      active = false;
      buffer.length = 0;

      for (const method of RECORDED_METHODS) {
        const original = originals.get(method);
        // Another recorder wrapped ours — leave its chain intact.
        if (original && console[method] === wrappers.get(method)) {
          console[method] = original;
        }
      }

      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    },
  };
}
