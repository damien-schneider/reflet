import { type Infer, v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  type MutationCtx,
} from "../../_generated/server";
import { TRANSCRIPTION_MODEL } from "../../ai/models";
import { rateLimiter } from "../../shared/rate_limits";
import { SESSION_TEXT_LIMITS } from "../constants";
import { truncateText } from "../formatters";
import type { spokenWordValidator } from "../validators";
import { startWaitingAnalysis } from "./analysis_request";
import {
  readOpenRouterKey,
  TRANSCRIPTION_NOT_CONFIGURED,
} from "./configuration";

const TRANSCRIPTION_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const TRANSCRIPTION_TIMEOUT_MS = 55_000;
const AUDIO_EVENT_TAG = /\[[^\]]*\]/g;
const BASE64_CHUNK_BYTES = 0x80_00;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const WHITESPACE_RUN = /\s+/g;
const MS_PER_SECOND = 1000;

const AUDIO_MISSING = "The recording of this passage is no longer available.";
const SERVICE_TIMED_OUT = "The transcription service did not answer in time.";
const SERVICE_UNREACHABLE = "The transcription service could not be reached.";
const SERVICE_UNREADABLE =
  "The transcription service sent an unreadable answer.";
const ORGANIZATION_QUOTA_REACHED =
  "Your organization reached its hourly transcription limit. Retry later or type this passage.";

const transcriptionResponseSchema = z.object({
  language: z.string().optional(),
  text: z.string(),
  words: z.array(z.object({ end: z.number(), word: z.string() })).optional(),
});

interface TimedWord {
  end: number;
  word: string;
}
type SpokenWord = Infer<typeof spokenWordValidator>;

interface WordTimings {
  segmentStartMs: number;
}

type TranscriptionOutcome =
  | {
      kind: "text";
      language: string | null;
      text: string;
      words: SpokenWord[];
    }
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

const locateWords = (
  spoken: { keptChars: number; text: string },
  words: TimedWord[],
  timings: WordTimings
): SpokenWord[] => {
  const located: SpokenWord[] = [];
  let cursor = 0;
  for (const { end, word } of words) {
    const spelled = word.trim();
    const textOffset =
      spelled === "" ? -1 : spoken.text.indexOf(spelled, cursor);
    if (textOffset !== -1 && textOffset < spoken.keptChars) {
      located.push({
        endMs: timings.segmentStartMs + Math.round(end * MS_PER_SECOND),
        textOffset,
      });
      cursor = textOffset + spelled.length;
    }
  }
  return located;
};

const spokenText = (
  response: z.infer<typeof transcriptionResponseSchema>,
  wordTimings: WordTimings | null
): TranscriptionOutcome => {
  const cleaned = response.text
    .replace(AUDIO_EVENT_TAG, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim();
  const text = truncateText(cleaned, SESSION_TEXT_LIMITS.segmentText);
  const keptChars = text === cleaned ? text.length : text.length - 1;
  return {
    kind: "text",
    language: response.language ?? null,
    text,
    words:
      wordTimings && response.words
        ? locateWords({ keptChars, text: cleaned }, response.words, wordTimings)
        : [],
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
  options: { apiKey: string; wordTimings: WordTimings | null }
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
        ...(options.wordTimings ? { timestamp_granularities: ["word"] } : {}),
      }),
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
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
      ? spokenText(parsed.data, options.wordTimings)
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
  claim: { storageId: Id<"_storage">; wordTimings: WordTimings | null }
): Promise<TranscriptionOutcome> => {
  const apiKey = readOpenRouterKey();
  if (apiKey === null) {
    return {
      error: TRANSCRIPTION_NOT_CONFIGURED,
      kind: "failure",
      retryable: false,
    };
  }
  const audio = await ctx.storage.get(claim.storageId);
  if (audio === null) {
    return { error: AUDIO_MISSING, kind: "failure", retryable: false };
  }
  return await requestTranscription(audio, {
    apiKey,
    wordTimings: claim.wordTimings,
  });
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
    const outcome = await transcribeStoredAudio(ctx, claim);
    if (outcome.kind === "text") {
      await ctx.runMutation(
        internal.sessions.ai.transcription_state.saveTranscription,
        {
          attempt: claim.attempt,
          language: outcome.language,
          segmentId,
          storageId: claim.storageId,
          text: outcome.text,
          words: outcome.words,
        }
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
