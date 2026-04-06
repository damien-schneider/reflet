import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { authenticateApiRequest } from "./lib/api_auth";
import { errorResponse, jsonResponse } from "./lib/api_helpers";

type Router = ReturnType<typeof httpRouter>;

export function registerSurveyRoutes(http: Router): void {
  // GET /api/v1/surveys/active - Get active survey for widget
  http.route({
    path: "/api/v1/surveys/active",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId } = authResult.auth;

        const url = new URL(request.url);
        const triggerType = url.searchParams.get("triggerType") || undefined;

        const survey = await ctx.runQuery(
          internal.surveys.responses.getActiveSurvey,
          {
            organizationId,
            triggerType: triggerType as
              | "manual"
              | "page_visit"
              | "time_delay"
              | "exit_intent"
              | "feedback_submitted"
              | undefined,
          }
        );

        return jsonResponse(survey);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/start - Start a survey response
  http.route({
    path: "/api/v1/surveys/respond/start",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        const { organizationId, externalUserId } = authResult.auth;

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const surveyId = body.surveyId as string | undefined;
        if (!surveyId) {
          return errorResponse("surveyId is required", 400);
        }

        const responseId = await ctx.runMutation(
          internal.surveys.responses.startResponse,
          {
            surveyId: surveyId as Id<"surveys">,
            organizationId,
            externalUserId,
            respondentId:
              typeof body.respondentId === "string"
                ? body.respondentId
                : undefined,
            pageUrl:
              typeof body.pageUrl === "string" ? body.pageUrl : undefined,
            userAgent:
              typeof body.userAgent === "string" ? body.userAgent : undefined,
          }
        );

        return jsonResponse({ responseId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/answer - Submit an answer
  http.route({
    path: "/api/v1/surveys/respond/answer",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const responseId = body.responseId as string | undefined;
        const questionId = body.questionId as string | undefined;
        const value = body.value;

        if (!(responseId && questionId) || value === undefined) {
          return errorResponse(
            "responseId, questionId, and value are required",
            400
          );
        }

        const answerId = await ctx.runMutation(
          internal.surveys.responses.submitAnswer,
          {
            responseId: responseId as Id<"surveyResponses">,
            questionId: questionId as Id<"surveyQuestions">,
            value: value as string | number | boolean | string[],
          }
        );

        return jsonResponse({ answerId });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });

  // POST /api/v1/surveys/respond/complete - Complete a survey response
  http.route({
    path: "/api/v1/surveys/respond/complete",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      try {
        const authResult = await authenticateApiRequest(ctx, request);
        if (!authResult.success) {
          return authResult.response;
        }

        let body: Record<string, unknown>;
        try {
          const raw: unknown = await request.json();
          if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
            return errorResponse("Invalid JSON body", 400);
          }
          body = raw as Record<string, unknown>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }

        const responseId = body.responseId as string | undefined;
        if (!responseId) {
          return errorResponse("responseId is required", 400);
        }

        await ctx.runMutation(internal.surveys.responses.completeResponse, {
          responseId: responseId as Id<"surveyResponses">,
        });

        return jsonResponse({ success: true });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500
        );
      }
    }),
  });
}
