const STACK_MAX_BYTES = 4096;

interface ErrorPayload {
  cause?: unknown;
  digest?: string;
  message: string;
  name: string;
  stack?: string;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}\n…[truncated]`;
}

function toPayload(error: unknown): ErrorPayload {
  if (error instanceof Error) {
    const payload: ErrorPayload = {
      name: error.name,
      message: error.message,
    };
    if (error.stack) {
      payload.stack = truncate(error.stack, STACK_MAX_BYTES);
    }
    const withDigest = error as Error & { digest?: string };
    if (withDigest.digest) {
      payload.digest = withDigest.digest;
    }
    if (error.cause !== undefined) {
      payload.cause =
        error.cause instanceof Error ? toPayload(error.cause) : error.cause;
    }
    return payload;
  }
  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

export function serializeError(error: unknown): string {
  return JSON.stringify(toPayload(error), null, 2);
}

export function isDevEnv(): boolean {
  return process.env.NODE_ENV !== "production";
}
