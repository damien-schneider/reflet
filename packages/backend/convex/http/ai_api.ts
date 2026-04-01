import type { httpRouter } from "convex/server";
import { api } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { createAuth } from "../auth/auth";
import {
  corsOptionsHandler,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;
type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function requireSession(
  ctx: ActionCtx,
  request: Request
): Promise<
  | { success: true; session: { user: { id: string } } }
  | { success: false; response: Response }
> {
  const auth = createAuth(ctx);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return {
      success: false,
      response: errorResponse("Authentication required", 401),
    };
  }
  return { success: true, session };
}

function handleAiError(error: unknown): Response {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  if (message === "AI service not configured") {
    return errorResponse(message, 503);
  }
  return errorResponse(message, 500);
}

const AI_API_PATHS = [
  "/api/ai/generate-release-title",
  "/api/ai/match-release-feedback",
] as const;

export function registerAiApiRoutes(http: Router): void {
  // POST /api/ai/generate-release-title
  http.route({
    path: "/api/ai/generate-release-title",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await requireSession(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      try {
        const parsed = await parseJsonBody(request);
        if (!parsed.success) {
          return parsed.response;
        }

        const description = parsed.body.description;
        if (typeof description !== "string" || !description) {
          return errorResponse("No description provided", 400);
        }

        const version =
          typeof parsed.body.version === "string"
            ? parsed.body.version
            : undefined;

        const title = await ctx.runAction(
          api.changelog.ai_actions.generateReleaseTitle,
          { description, version }
        );

        return jsonResponse({ title });
      } catch (error) {
        return handleAiError(error);
      }
    }),
  });

  // POST /api/ai/match-release-feedback
  http.route({
    path: "/api/ai/match-release-feedback",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const authResult = await requireSession(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      try {
        const parsed = await parseJsonBody(request);
        if (!parsed.success) {
          return parsed.response;
        }

        const { body } = parsed;

        if (typeof body.releaseNotes !== "string") {
          return errorResponse("releaseNotes is required", 400);
        }
        if (!Array.isArray(body.commits)) {
          return errorResponse("commits array is required", 400);
        }
        if (!Array.isArray(body.feedbackItems)) {
          return errorResponse("feedbackItems array is required", 400);
        }

        const matches = await ctx.runAction(
          api.changelog.ai_actions.matchReleaseFeedback,
          {
            releaseNotes: body.releaseNotes,
            commits: body.commits as Array<{
              sha: string;
              message: string;
              fullMessage?: string;
              author: string;
            }>,
            feedbackItems: body.feedbackItems as Array<{
              id: string;
              title: string;
              description?: string;
              status: string;
              tags: string[];
            }>,
          }
        );

        return jsonResponse({ matches });
      } catch (error) {
        return handleAiError(error);
      }
    }),
  });

  // CORS preflight
  for (const path of AI_API_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
