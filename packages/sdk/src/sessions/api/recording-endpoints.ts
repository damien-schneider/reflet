import { z } from "zod";
import {
  sessionEvidenceSchema,
  sessionSegmentSchema,
  sessionSummarySchema,
} from "../protocol";
import type { SessionApi } from "./session-api";
import type { SessionRequests } from "./session-requests";

export const summaryResponse = z.object({ session: sessionSummarySchema });
export const segmentResponse = z.object({ segment: sessionSegmentSchema });

type RecordingEndpoints = Pick<
  SessionApi,
  | "addEvidence"
  | "addVoiceSegment"
  | "collection"
  | "events"
  | "start"
  | "uploadUrl"
>;

export function createRecordingEndpoints({
  post,
}: SessionRequests): RecordingEndpoints {
  return {
    addEvidence: async (body) =>
      (
        await post(
          "/api/v1/sessions/evidence",
          body,
          z.object({ evidence: sessionEvidenceSchema })
        )
      ).evidence,
    addVoiceSegment: async (body) =>
      (await post("/api/v1/sessions/segments", body, segmentResponse)).segment,
    collection: async (body) =>
      (await post("/api/v1/sessions/collection", body, summaryResponse))
        .session,
    events: (body) =>
      post(
        "/api/v1/sessions/events",
        body,
        z.object({
          accepted: z.number(),
          dropped: z.number(),
          limitReached: z.boolean(),
        })
      ),
    start: async (body) =>
      (await post("/api/v1/sessions/start", body, summaryResponse)).session,
    uploadUrl: async (body) =>
      (
        await post(
          "/api/v1/sessions/upload-url",
          body,
          z.object({ uploadUrl: z.string() })
        )
      ).uploadUrl,
  };
}
