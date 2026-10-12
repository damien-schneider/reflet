import type { HttpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import {
  registerSessionEndpoint,
  type SessionEndpoint,
  sessionGet,
  sessionPost,
} from "./route";
import {
  collectionBody,
  correctSegmentBody,
  eventsBody,
  evidenceBody,
  segmentBody,
  segmentIdBody,
  sessionIdBody,
  startBody,
  updateBody,
  uploadUrlBody,
} from "./schemas";

const CAPTURE_ENDPOINTS: SessionEndpoint[] = [
  {
    handler: sessionGet((ctx, actor) =>
      ctx.runQuery(internal.sessions.views.queries.identity, { actor })
    ),
    method: "GET",
    path: "/api/v1/sessions/identity",
  },
  {
    handler: sessionGet((ctx, actor) =>
      ctx.runQuery(internal.sessions.views.queries.list, { actor })
    ),
    method: "GET",
    path: "/api/v1/sessions/list",
  },
  {
    handler: sessionGet((ctx, actor, params) =>
      ctx.runQuery(internal.sessions.views.queries.detail, {
        actor,
        sessionId: params.get("sessionId") ?? "",
      })
    ),
    method: "GET",
    path: "/api/v1/sessions/detail",
  },
  {
    handler: sessionPost(startBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.lifecycle.start.start, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/start",
  },
  {
    handler: sessionPost(collectionBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.lifecycle.start.collection, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/collection",
  },
  {
    handler: sessionPost(updateBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.lifecycle.start.update, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/update",
  },
  {
    handler: sessionPost(sessionIdBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.lifecycle.removal.remove, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/delete",
  },
  {
    handler: sessionPost(eventsBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.events.record, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/events",
  },
  {
    handler: sessionPost(uploadUrlBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.uploads.uploadUrl, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/upload-url",
  },
  {
    handler: sessionPost(segmentBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.segments.register, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/segments",
  },
  {
    handler: sessionPost(correctSegmentBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.segments.correct, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/segments/correct",
  },
  {
    handler: sessionPost(segmentIdBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.segments.retry, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/segments/retry",
  },
  {
    handler: sessionPost(evidenceBody, (ctx, actor, body) =>
      ctx.runMutation(internal.sessions.capture.evidence.register, {
        actor,
        ...body,
      })
    ),
    method: "POST",
    path: "/api/v1/sessions/evidence",
  },
];

export function registerSessionCaptureRoutes(http: HttpRouter): void {
  for (const endpoint of CAPTURE_ENDPOINTS) {
    registerSessionEndpoint(http, endpoint);
  }
}
