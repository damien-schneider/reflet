import { type SessionApi, SessionApiError } from "../../api/session-api";
import type { SpeakerToken } from "../../protocol";

const RETRYABLE_TOKEN_STATUSES = new Set([408, 500, 502, 504]);

export function requestSpeakerToken(
  api: Pick<SessionApi, "speakerToken">
): () => Promise<SpeakerToken | null> {
  return () =>
    api.speakerToken().catch((error: unknown) => {
      if (
        error instanceof SessionApiError &&
        !RETRYABLE_TOKEN_STATUSES.has(error.status)
      ) {
        return null;
      }
      throw error;
    });
}
