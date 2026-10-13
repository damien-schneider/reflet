import type { HttpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import {
  registerSessionEndpoint,
  type SessionEndpoint,
  sessionGet,
  sessionPost,
} from "./route";
import {
  acceptChangesBody,
  answerQuestionBody,
  attachBody,
  contributionIdBody,
  decideChangeBody,
  proposalIdBody,
  segmentContextBody,
} from "./schemas";

const accept = internal.sessions.intentions.accept;
const attach = internal.sessions.intentions.attach;
const context = internal.sessions.review.context;

const INTENTION_ENDPOINTS: SessionEndpoint[] = [
  {
    handler: sessionPost(acceptChangesBody, (ctx, actor, body) =>
      ctx.runMutation(accept.accept, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/accept",
  },
  {
    handler: sessionPost(decideChangeBody, (ctx, actor, body) =>
      ctx.runMutation(accept.decideChange, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/change",
  },
  {
    handler: sessionPost(answerQuestionBody, (ctx, actor, body) =>
      ctx.runMutation(accept.answer, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/answer",
  },
  {
    handler: sessionPost(attachBody, (ctx, actor, body) =>
      ctx.runMutation(attach.attach, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/attach",
  },
  {
    handler: sessionPost(proposalIdBody, (ctx, actor, body) =>
      ctx.runMutation(attach.keepSeparate, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/keep-separate",
  },
  {
    handler: sessionPost(contributionIdBody, (ctx, actor, body) =>
      ctx.runMutation(attach.detach, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/intentions/detach",
  },
  {
    handler: sessionPost(segmentContextBody, (ctx, actor, body) =>
      ctx.runMutation(context.setContext, { actor, ...body })
    ),
    method: "POST",
    path: "/api/v1/sessions/segments/context",
  },
  {
    handler: sessionGet((ctx, actor, params) =>
      ctx.runQuery(context.contextChoices, {
        actor,
        segmentId: params.get("segmentId") ?? "",
      })
    ),
    method: "GET",
    path: "/api/v1/sessions/segments/context-choices",
  },
];

export function registerSessionIntentionRoutes(http: HttpRouter): void {
  for (const endpoint of INTENTION_ENDPOINTS) {
    registerSessionEndpoint(http, endpoint);
  }
}
