import { RefletAuthError, RefletError, RefletNotFoundError } from "./types";

/** Returns `unknown`: callers narrow before use. */
export function parseJsonSafely(text: string, status: number): unknown {
  try {
    return JSON.parse(text);
  } catch (parseError) {
    throw new RefletError(
      `Invalid response: ${parseError instanceof Error ? parseError.message : "Failed to parse JSON"}`,
      status
    );
  }
}

function isErrorResponse(data: unknown): data is { error: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  );
}

function throwHttpError(message: string, status: number): never {
  if (status === 401) {
    throw new RefletAuthError(message);
  }
  if (status === 404) {
    throw new RefletNotFoundError(message);
  }
  throw new RefletError(message, status);
}

/** Throws the typed Reflet error for a failed response, using the API's `{ error }` message when present. */
export async function throwResponseError(response: Response): Promise<never> {
  const fallbackMessage = `Request failed with status ${response.status}`;
  const text = await response.text();
  if (!text) {
    throwHttpError(fallbackMessage, response.status);
  }

  const data = parseJsonSafely(text, response.status);
  throwHttpError(
    isErrorResponse(data) ? data.error : fallbackMessage,
    response.status
  );
}
