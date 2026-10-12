import type { HttpRouter, PublicHttpAction } from "convex/server";
import { ConvexError } from "convex/values";
import { z } from "zod";
import type { httpAction } from "../../_generated/server";
import type { SessionActor } from "../../sessions/access";
import type { SessionApiPath } from "../../sessions/constants";
import { rateLimiter } from "../../shared/rate_limits";
import {
  apiRoute,
  corsOptionsHandler,
  errorResponse,
  jsonResponse,
} from "../helpers";
import { readJsonBody } from "../public_api/route";
import { authenticateSessionMember, type SessionMember } from "./member_auth";

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

const TOO_MANY_WRITES = "Too many session updates. Try again in a minute.";

const sessionFailureSchema = z.object({
  error: z.string(),
  limit: z
    .enum(["duration", "segments", "events", "evidence", "bytes"])
    .optional(),
  status: z.number().int().min(400).max(599),
});

function failureResponse(error: unknown): Response | null {
  if (!(error instanceof ConvexError)) {
    return null;
  }
  const failure = sessionFailureSchema.safeParse(error.data);
  if (!failure.success) {
    return null;
  }
  const { status, ...body } = failure.data;
  return jsonResponse(body, status);
}

async function respond(run: () => Promise<unknown>): Promise<Response> {
  try {
    return jsonResponse(await run());
  } catch (error) {
    const response = failureResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }
}

const actorOf = (member: SessionMember): SessionActor => ({
  organizationId: member.organizationId,
  userId: member.userId,
});

type SessionRun<TBody> = (
  ctx: ActionCtx,
  actor: SessionActor,
  body: TBody
) => Promise<unknown>;

export function sessionGet(run: SessionRun<URLSearchParams>): PublicHttpAction {
  return apiRoute(authenticateSessionMember, (ctx, request, member) =>
    respond(() => run(ctx, actorOf(member), new URL(request.url).searchParams))
  );
}

export function sessionPost<TSchema extends z.ZodType>(
  schema: TSchema,
  run: SessionRun<z.infer<TSchema>>
): PublicHttpAction {
  return apiRoute(authenticateSessionMember, async (ctx, request, member) => {
    const body = await readJsonBody(request, schema);
    if (!body.success) {
      return body.response;
    }
    const { ok } = await rateLimiter.limit(ctx, "sessionWritePerMember", {
      key: `${member.organizationId}:${member.userId}`,
    });
    if (!ok) {
      return errorResponse(TOO_MANY_WRITES, 429);
    }
    return await respond(() => run(ctx, actorOf(member), body.data));
  });
}

export interface SessionEndpoint {
  handler: PublicHttpAction;
  method: "GET" | "POST";
  path: SessionApiPath;
}

export function registerSessionEndpoint(
  http: HttpRouter,
  endpoint: SessionEndpoint
): void {
  http.route(endpoint);
  http.route({
    handler: corsOptionsHandler(),
    method: "OPTIONS",
    path: endpoint.path,
  });
}
