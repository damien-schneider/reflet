import { z } from "zod";
import type { SessionApiPath } from "../api-paths";
import {
  analysisStatusSchema,
  contextOptionSchema,
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
  | "analyze"
  | "deleteSession"
  | "detail"
  | "identity"
  | "list"
  | "removeEvidence"
  | "update"
>;

type SegmentEndpoints = Pick<
  SessionApi,
  | "addTypedSegment"
  | "contextChoices"
  | "correctSegment"
  | "retrySegment"
  | "setSegmentContext"
>;

export function createReviewEndpoints({
  get,
  post,
}: SessionRequests): ReviewEndpoints {
  return {
    analyze: async (sessionId) =>
      (
        await post(
          "/api/v1/sessions/analyze",
          { sessionId },
          z.object({ analysis: analysisStatusSchema })
        )
      ).analysis,
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
    update: async (body) =>
      (await post("/api/v1/sessions/update", body, summaryResponse)).session,
  };
}

export function createSegmentEndpoints({
  get,
  post,
}: SessionRequests): SegmentEndpoints {
  const postSegment = async (path: SessionApiPath, body: unknown) =>
    (await post(path, body, segmentResponse)).segment;
  return {
    addTypedSegment: (body) => postSegment("/api/v1/sessions/segments", body),
    contextChoices: async (segmentId) =>
      (
        await get(
          "/api/v1/sessions/segments/context-choices",
          z.object({ options: z.array(contextOptionSchema) }),
          { segmentId }
        )
      ).options,
    correctSegment: (body) =>
      postSegment("/api/v1/sessions/segments/correct", body),
    retrySegment: (segmentId) =>
      postSegment("/api/v1/sessions/segments/retry", { segmentId }),
    setSegmentContext: (body) =>
      postSegment("/api/v1/sessions/segments/context", body),
  };
}
