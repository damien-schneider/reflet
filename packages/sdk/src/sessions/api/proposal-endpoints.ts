import { z } from "zod";
import type { SessionApiPath } from "../api-paths";
import {
  continuedIntentionSchema,
  sessionContributionSchema,
} from "../intention-protocol";
import {
  handoffFileSchema,
  sessionHandoffSchema,
  sessionProposalSchema,
} from "../protocol";
import type { SessionApi } from "./session-api";
import type { SessionRequests } from "./session-requests";

const proposalResponse = z.object({ proposal: sessionProposalSchema });

const intentionUpdateResponse = z.object({
  contribution: sessionContributionSchema,
  intention: continuedIntentionSchema.nullable(),
});

type ProposalEndpoints = Pick<
  SessionApi,
  | "clarifyProposal"
  | "createFeedback"
  | "createHandoff"
  | "createProposal"
  | "decideProposal"
  | "editProposal"
  | "markHandoffDelivered"
  | "mergeProposals"
  | "separateProposal"
  | "verifyProposal"
>;

type IntentionEndpoints = Pick<
  SessionApi,
  | "acceptIntentionChanges"
  | "answerIntentionQuestion"
  | "attachToIntention"
  | "deleteProposal"
  | "detachContribution"
  | "keepSeparate"
  | "reopenOrRejectChange"
>;

const proposalPoster =
  ({ post }: SessionRequests) =>
  async (path: SessionApiPath, body: unknown) =>
    (await post(path, body, proposalResponse)).proposal;

export function createProposalEndpoints(
  requests: SessionRequests
): ProposalEndpoints {
  const { post } = requests;
  const postProposal = proposalPoster(requests);
  return {
    clarifyProposal: (body) =>
      postProposal("/api/v1/sessions/proposals/clarify", body),
    createFeedback: (proposalId) =>
      post(
        "/api/v1/sessions/proposals/feedback",
        { proposalId },
        z.object({ created: z.boolean(), feedbackId: z.string() })
      ),
    createHandoff: (body) =>
      post(
        "/api/v1/sessions/handoffs",
        body,
        z.object({
          files: z.array(handoffFileSchema),
          handoff: sessionHandoffSchema,
        })
      ),
    createProposal: (body) =>
      postProposal("/api/v1/sessions/proposals/create", body),
    decideProposal: (body) =>
      postProposal("/api/v1/sessions/proposals/decide", body),
    editProposal: (body) =>
      postProposal("/api/v1/sessions/proposals/edit", body),
    markHandoffDelivered: async (body) =>
      (
        await post(
          "/api/v1/sessions/handoffs/delivered",
          body,
          z.object({ handoff: sessionHandoffSchema })
        )
      ).handoff,
    mergeProposals: (body) =>
      postProposal("/api/v1/sessions/proposals/merge", body),
    separateProposal: (proposalId) =>
      postProposal("/api/v1/sessions/proposals/separate", { proposalId }),
    verifyProposal: (body) =>
      postProposal("/api/v1/sessions/proposals/verify", body),
  };
}

export function createIntentionEndpoints(
  requests: SessionRequests
): IntentionEndpoints {
  const { post } = requests;
  const postProposal = proposalPoster(requests);
  const postIntentionUpdate = (path: SessionApiPath, body: unknown) =>
    post(path, body, intentionUpdateResponse);
  return {
    acceptIntentionChanges: (body) =>
      postIntentionUpdate("/api/v1/sessions/intentions/accept", body),
    answerIntentionQuestion: (body) =>
      postIntentionUpdate("/api/v1/sessions/intentions/answer", body),
    attachToIntention: (body) =>
      postProposal("/api/v1/sessions/intentions/attach", body),
    deleteProposal: async (proposalId) => {
      await post(
        "/api/v1/sessions/proposals/delete",
        { proposalId },
        z.object({ deleted: z.literal(true) })
      );
    },
    detachContribution: (contributionId) =>
      postIntentionUpdate("/api/v1/sessions/intentions/detach", {
        contributionId,
      }),
    keepSeparate: (proposalId) =>
      postProposal("/api/v1/sessions/intentions/keep-separate", { proposalId }),
    reopenOrRejectChange: (body) =>
      postIntentionUpdate("/api/v1/sessions/intentions/change", body),
  };
}
