import { z } from "zod";
import {
  handoffFileSchema,
  type SessionApiPath,
  sessionHandoffSchema,
  sessionProposalSchema,
} from "../protocol";
import type { SessionApi } from "./session-api";
import type { SessionRequests } from "./session-requests";

const proposalResponse = z.object({ proposal: sessionProposalSchema });

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

export function createProposalEndpoints({
  post,
}: SessionRequests): ProposalEndpoints {
  const postProposal = async (path: SessionApiPath, body: unknown) =>
    (await post(path, body, proposalResponse)).proposal;

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
