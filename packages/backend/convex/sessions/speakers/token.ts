import { z } from "zod";
import type { ActionCtx } from "../../_generated/server";
import { SPEAKER_DETECTION_MODEL } from "../../ai/models";
import { rateLimiter } from "../../shared/rate_limits";
import { type SessionActor, sessionFailure } from "../access";
import {
  readMistralKey,
  SPEAKER_DETECTION_NOT_CONFIGURED,
} from "../ai/configuration";

const CLIENT_SESSION_URL = "https://api.mistral.ai/v1/client/sessions";
const REALTIME_URL = `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=${SPEAKER_DETECTION_MODEL}`;
const TOKEN_TTL_SECONDS = 120;
const MINT_TIMEOUT_MS = 10_000;
const TOO_MANY_REQUESTS_STATUS = 429;
const BAD_GATEWAY_STATUS = 502;
const SERVICE_UNAVAILABLE_STATUS = 503;

const TOO_MANY_TOKENS =
  "Too many speaker detection starts. Try again in a few minutes.";
const SERVICE_TIMED_OUT =
  "The speaker detection service did not answer in time.";
const SERVICE_UNREACHABLE =
  "The speaker detection service could not be reached.";
const SERVICE_UNREADABLE =
  "The speaker detection service sent an unreadable answer.";

const clientSessionSchema = z.object({
  client_secret: z.object({
    expires_at: z.iso.datetime({ offset: true }),
    value: z.string().min(1),
  }),
});

export interface SpeakerToken {
  expiresAt: number;
  token: string;
  url: string;
}

const speakerServiceFailure = (error: string) => {
  console.warn(`[sessions.speakers] token mint failed: ${error}`);
  return sessionFailure(BAD_GATEWAY_STATUS, error);
};

const requestClientSession = async (apiKey: string): Promise<Response> => {
  try {
    return await fetch(CLIENT_SESSION_URL, {
      body: JSON.stringify({
        model: SPEAKER_DETECTION_MODEL,
        purpose: "realtime",
        ttl_seconds: TOKEN_TTL_SECONDS,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(MINT_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw speakerServiceFailure(
      timedOut ? SERVICE_TIMED_OUT : SERVICE_UNREACHABLE
    );
  }
};

export async function mintSpeakerToken(
  ctx: ActionCtx,
  actor: SessionActor
): Promise<SpeakerToken> {
  const apiKey = readMistralKey();
  if (apiKey === null) {
    throw sessionFailure(
      SERVICE_UNAVAILABLE_STATUS,
      SPEAKER_DETECTION_NOT_CONFIGURED
    );
  }
  const { ok } = await rateLimiter.limit(ctx, "sessionSpeakerTokenPerMember", {
    key: `${actor.organizationId}:${actor.userId}`,
  });
  if (!ok) {
    throw sessionFailure(TOO_MANY_REQUESTS_STATUS, TOO_MANY_TOKENS);
  }
  const response = await requestClientSession(apiKey);
  if (!response.ok) {
    await response.body?.cancel();
    throw speakerServiceFailure(
      `The speaker detection service answered with HTTP ${response.status}.`
    );
  }
  const parsed = clientSessionSchema.safeParse(
    await response.json().catch(() => null)
  );
  if (!parsed.success) {
    throw speakerServiceFailure(SERVICE_UNREADABLE);
  }
  return {
    expiresAt: Date.parse(parsed.data.client_secret.expires_at),
    token: parsed.data.client_secret.value,
    url: REALTIME_URL,
  };
}
