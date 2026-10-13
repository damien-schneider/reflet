import { z } from "zod";
import {
  analysisStatusSchema,
  sessionDetailSchema,
  sessionEvidenceSchema,
  sessionIdentitySchema,
  sessionSummarySchema,
} from "../protocol";
import { segmentResponse, summaryResponse } from "./recording-endpoints";
import type { SessionApi } from "./session-api";
import type { SessionRequests } from "./session-requests";

type ReviewEndpoints = Pick<
  SessionApi,
  | "addTypedSegment"
  | "analyze"
  | "correctSegment"
  | "deleteSession"
  | "detail"
  | "identity"
  | "list"
  | "removeEvidence"
  | "retrySegment"
  | "update"
>;

export function createReviewEndpoints({
  get,
  post,
}: SessionRequests): ReviewEndpoints {
  return {
    addTypedSegment: async (body) =>
      (await post("/api/v1/sessions/segments", body, segmentResponse)).segment,
    analyze: async (sessionId) =>
      (
        await post(
          "/api/v1/sessions/analyze",
          { sessionId },
          z.object({ analysis: analysisStatusSchema })
        )
      ).analysis,
    correctSegment: async (body) =>
      (await post("/api/v1/sessions/segments/correct", body, segmentResponse))
        .segment,
    deleteSession: async (sessionId) => {
      await post(
        "/api/v1/sessions/delete",
        { sessionId },
        z.object({ deleted: z.literal(true) })
      );
    },
    detail: (sessionId) =>
      get("/api/v1/sessions/detail", sessionDetailSchema, { sessionId }),
    identity: () => get("/api/v1/sessions/identity", sessionIdentitySchema),
    list: async () =>
      (
        await get(
          "/api/v1/sessions/list",
          z.object({ sessions: z.array(sessionSummarySchema) })
        )
      ).sessions,
    removeEvidence: async (evidenceId) =>
      (
        await post(
          "/api/v1/sessions/evidence/remove",
          { evidenceId },
          z.object({ evidence: sessionEvidenceSchema })
        )
      ).evidence,
    retrySegment: async (segmentId) =>
      (
        await post(
          "/api/v1/sessions/segments/retry",
          { segmentId },
          segmentResponse
        )
      ).segment,
    update: async (body) =>
      (await post("/api/v1/sessions/update", body, summaryResponse)).session,
  };
}
