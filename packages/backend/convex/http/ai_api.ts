import { isRateLimitError } from "@convex-dev/rate-limiter";
import type { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { AI_ACCESS_DENIED } from "../ai/constants";
import { createAuth } from "../auth/auth";
import {
  corsOptionsHandler,
  errorResponse,
  jsonResponse,
  parseId,
  parseJsonBody,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;
type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

const MAX_AI_TEXT_LENGTH = 20_000;
const MAX_COMMIT_MESSAGE_LENGTH = 2000;
const MAX_SHORT_FIELD_LENGTH = 200;
const MAX_FEEDBACK_DESCRIPTION_LENGTH = 10_000;
const MAX_COMMITS = 100;
const MAX_FEEDBACK_ITEMS = 100;
const MAX_TAGS = 50;

const shortField = z.string().max(MAX_SHORT_FIELD_LENGTH);
const clippedText = (maxLength: number) =>
  z.string().transform((value) => value.slice(0, maxLength));

const titleRequestSchema = z.object({
  description: z.string().min(1).max(MAX_AI_TEXT_LENGTH),
  organizationId: shortField.min(1),
  version: shortField.optional(),
});

const matchRequestSchema = z.object({
  commits: z
    .array(
      z.object({
        author: clippedText(MAX_SHORT_FIELD_LENGTH),
        fullMessage: clippedText(MAX_COMMIT_MESSAGE_LENGTH).optional(),
        message: clippedText(MAX_COMMIT_MESSAGE_LENGTH),
        sha: shortField,
      })
    )
    .max(MAX_COMMITS),
  feedbackItems: z
    .array(
      z.object({
        description: clippedText(MAX_FEEDBACK_DESCRIPTION_LENGTH).optional(),
        id: shortField,
        status: shortField,
        tags: z.array(clippedText(MAX_SHORT_FIELD_LENGTH)).max(MAX_TAGS),
        title: clippedText(MAX_SHORT_FIELD_LENGTH),
      })
    )
    .max(MAX_FEEDBACK_ITEMS),
  organizationId: shortField.min(1),
  releaseNotes: clippedText(MAX_AI_TEXT_LENGTH),
});

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
      response: errorResponse("Authentication required", 401),
      success: false,
    };
  }
  return { session, success: true };
}

function isAiAccessDenied(error: unknown): boolean {
  if (!(error instanceof ConvexError)) {
    return false;
  }
  const data: unknown = error.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "kind" in data &&
    data.kind === AI_ACCESS_DENIED
  );
}

function handleAiError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return errorResponse("Invalid request body", 400);
  }
  if (isRateLimitError(error)) {
    return errorResponse("AI generation limit reached, try again later", 429);
  }
  if (isAiAccessDenied(error)) {
    return errorResponse("Only admins can use AI generation", 403);
  }
  if (error instanceof Error && error.message === "AI service not configured") {
    return errorResponse(error.message, 503);
  }
  return errorResponse("AI request failed", 500);
}

const AI_API_PATHS = [
  "/api/ai/generate-release-title",
  "/api/ai/match-release-feedback",
] as const;

export function registerAiApiRoutes(http: Router): void {
  http.route({
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
        const { description, organizationId, version } =
          titleRequestSchema.parse(parsed.body);
        await ctx.runMutation(
          internal.ai.usage_gate.consumeAiGenerationForUser,
          {
            organizationId: parseId<"organizations">(
              organizationId,
              "organizationId"
            ),
            userId: authResult.session.user.id,
          }
        );

        const title = await ctx.runAction(
          internal.changelog.ai_actions.generateReleaseTitle,
          { description, version }
        );

        return jsonResponse({ title });
      } catch (error) {
        return handleAiError(error);
      }
    }),
    method: "POST",
    path: "/api/ai/generate-release-title",
  });

  http.route({
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
        const { commits, feedbackItems, organizationId, releaseNotes } =
          matchRequestSchema.parse(parsed.body);
        await ctx.runMutation(
          internal.ai.usage_gate.consumeAiGenerationForUser,
          {
            organizationId: parseId<"organizations">(
              organizationId,
              "organizationId"
            ),
            userId: authResult.session.user.id,
          }
        );

        const matches = await ctx.runAction(
          internal.changelog.ai_actions.matchReleaseFeedback,
          { commits, feedbackItems, releaseNotes }
        );

        return jsonResponse({ matches });
      } catch (error) {
        return handleAiError(error);
      }
    }),
    method: "POST",
    path: "/api/ai/match-release-feedback",
  });

  for (const path of AI_API_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
