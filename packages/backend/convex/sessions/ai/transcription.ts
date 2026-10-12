import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  type MutationCtx,
} from "../../_generated/server";
import { rateLimiter } from "../../shared/rate_limits";
import { SESSION_TEXT_LIMITS } from "../constants";
import { truncateText } from "../formatters";
import { startWaitingAnalysis } from "./analysis_request";
import {
  readOpenRouterKey,
  TRANSCRIPTION_NOT_CONFIGURED,
} from "./configuration";

const TRANSCRIPTION_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const TRANSCRIPTION_MODEL = "openai/whisper-large-v3";
const TRANSCRIPTION_TIMEOUT_MS = 55_000;
const NO_SPEECH_THRESHOLD = 0.6;
const BASE64_CHUNK_BYTES = 0x80_00;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const WHITESPACE_RUN = /\s+/g;

const AUDIO_MISSING = "The recording of this passage is no longer available.";
const SERVICE_TIMED_OUT = "The transcription service did not answer in time.";
const SERVICE_UNREACHABLE = "The transcription service could not be reached.";
const SERVICE_UNREADABLE =
  "The transcription service sent an unreadable answer.";
const ORGANIZATION_QUOTA_REACHED =
  "Your organization reached its hourly transcription limit. Retry later or type this passage.";

const transcriptionResponseSchema = z.object({
  language: z.string().optional(),
  segments: z
    .array(
      z.object({ no_speech_prob: z.number().optional(), text: z.string() })
    )
    .optional(),
  text: z.string(),
});

type TranscriptionOutcome =
  | { kind: "text"; language: string | null; text: string }
  | { kind: "failure"; error: string; retryable: boolean };

export async function scheduleTranscription(
  ctx: MutationCtx,
  segmentId: Id<"sessionSegments">
): Promise<void> {
  const segment = await ctx.db.get(segmentId);
  if (!segment) {
    return;
  }
  const { ok } = await rateLimiter.limit(ctx, "sessionTranscriptionPerOrg", {
    key: segment.organizationId,
  });
  if (!ok) {
    await ctx.db.patch(segmentId, {
      transcription: {
        attempts: segment.transcription.attempts,
        error: ORGANIZATION_QUOTA_REACHED,
        state: "failed",
        updatedAt: Date.now(),
      },
    });
    await startWaitingAnalysis(ctx, segment.sessionId);
    return;
  }
  await ctx.db.patch(segmentId, {
    transcription: {
      attempts: segment.transcription.attempts,
      state: "pending",
      updatedAt: Date.now(),
    },
  });
  await ctx.scheduler.runAfter(
    0,
    internal.sessions.ai.transcription.transcribeSegment,
    { segmentId }
  );
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES)
    );
  }
  return btoa(binary);
};

const spokenText = (
  response: z.infer<typeof transcriptionResponseSchema>
): TranscriptionOutcome => {
  const spoken = response.segments
    ? response.segments
        .filter((part) => (part.no_speech_prob ?? 0) <= NO_SPEECH_THRESHOLD)
        .map((part) => part.text)
        .join(" ")
    : response.text;
  return {
    kind: "text",
    language: response.language ?? null,
    text: truncateText(
      spoken.replace(WHITESPACE_RUN, " ").trim(),
      SESSION_TEXT_LIMITS.segmentText
    ),
  };
};

const describeHttpFailure = (status: number): TranscriptionOutcome => ({
  error: `The transcription service answered with HTTP ${status}.`,
  kind: "failure",
  retryable:
    status === HTTP_REQUEST_TIMEOUT ||
    status === HTTP_TOO_MANY_REQUESTS ||
    status >= HTTP_SERVER_ERROR,
});

const requestTranscription = async (
  audio: Blob,
  apiKey: string
): Promise<TranscriptionOutcome> => {
  try {
    const response = await fetch(TRANSCRIPTION_URL, {
      body: JSON.stringify({
        input_audio: {
          data: toBase64(new Uint8Array(await audio.arrayBuffer())),
          format: "wav",
        },
        model: TRANSCRIPTION_MODEL,
        provider: { zdr: true },
        response_format: "verbose_json",
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return describeHttpFailure(response.status);
    }
    const parsed = transcriptionResponseSchema.safeParse(await response.json());
    return parsed.success
      ? spokenText(parsed.data)
      : { error: SERVICE_UNREADABLE, kind: "failure", retryable: true };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      error: timedOut ? SERVICE_TIMED_OUT : SERVICE_UNREACHABLE,
      kind: "failure",
      retryable: true,
    };
  }
};

const transcribeStoredAudio = async (
  ctx: ActionCtx,
  storageId: Id<"_storage">
): Promise<TranscriptionOutcome> => {
  const apiKey = readOpenRouterKey();
  if (apiKey === null) {
    return {
      error: TRANSCRIPTION_NOT_CONFIGURED,
      kind: "failure",
      retryable: false,
    };
  }
  const audio = await ctx.storage.get(storageId);
  if (audio === null) {
    return { error: AUDIO_MISSING, kind: "failure", retryable: false };
  }
  return await requestTranscription(audio, apiKey);
};

export const transcribeSegment = internalAction({
  args: { segmentId: v.id("sessionSegments") },
  handler: async (ctx, { segmentId }) => {
    const claim = await ctx.runMutation(
      internal.sessions.ai.transcription_state.claimTranscription,
      { segmentId }
    );
    if (claim === null) {
      return null;
    }
    const outcome = await transcribeStoredAudio(ctx, claim.storageId);
    if (outcome.kind === "text") {
      await ctx.runMutation(
        internal.sessions.ai.transcription_state.saveTranscription,
        { ...claim, language: outcome.language, segmentId, text: outcome.text }
      );
      return null;
    }
    console.warn(
      `[sessions.transcription] segment ${segmentId} attempt ${claim.attempt} failed: ${outcome.error}`
    );
    await ctx.runMutation(
      internal.sessions.ai.transcription_state.recordTranscriptionFailure,
      {
        attempt: claim.attempt,
        error: outcome.error,
        retryable: outcome.retryable,
        segmentId,
      }
    );
    return null;
  },
  returns: v.null(),
});
