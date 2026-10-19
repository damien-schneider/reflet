import type { HttpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import {
  registerSessionEndpoint,
  type SessionEndpoint,
  sessionPost,
} from "./route";
import {
  briefSelectionBody,
  clarifyProposalBody,
  decideProposalBody,
  deliveredBody,
  editProposalBody,
  handoffBody,
  mergeProposalsBody,
  proposalIdBody,
  sessionIdBody,
  verifyProposalBody,
} from "./schemas";

const proposals = internal.sessions.review.proposals;

const REVIEW_ENDPOINTS: SessionEndpoint[] = [
  {
    handler: sessionPost(sessionIdBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.analysis.analyze, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/analyze",
  },
  {
    handler: sessionPost(decideProposalBody, (ctx, actor, body) =>
      ctx.runMutation(proposals.decide, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/decide",
  },
  {
    handler: sessionPost(editProposalBody, (ctx, actor, body) =>
      ctx.runMutation(proposals.edit, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/edit",
  },
  {
    handler: sessionPost(clarifyProposalBody, (ctx, actor, body) =>
      ctx.runMutation(proposals.clarify, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/clarify",
  },
  {
    handler: sessionPost(verifyProposalBody, (ctx, actor, body) =>
      ctx.runMutation(proposals.verify, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/verify",
  },
  {
    handler: sessionPost(mergeProposalsBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.merge.merge, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/merge",
  },
  {
    handler: sessionPost(proposalIdBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.merge.separate, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/separate",
  },
  {
    handler: sessionPost(proposalIdBody, (ctx, actor, body) =>
      ctx.runMutation(proposals.remove, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/delete",
  },
  {
    handler: sessionPost(proposalIdBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.feedback.materialize, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/proposals/feedback",
  },
  {
    handler: sessionPost(handoffBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.handoffs.create, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/handoffs",
  },
  {
    handler: sessionPost(briefSelectionBody, (ctx, actor, body) =>
      ctx.runQuery(internal.sessions.review.handoffs.preview, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/handoffs/preview",
  },
  {
    handler: sessionPost(deliveredBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.review.handoffs.delivered, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/handoffs/delivered",
  },
];

export function registerSessionReviewRoutes(http: HttpRouter): void {
  for (const endpoint of REVIEW_ENDPOINTS) {
    registerSessionEndpoint(http, endpoint);
  }
}
