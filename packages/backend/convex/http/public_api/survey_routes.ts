import type { httpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import { jsonResponse, parseId } from "../helpers";
import { parseEnumParam } from "./auth";
import { publicApiRoute, readJsonBody } from "./route";
import {
  completeSurveyResponseSchema,
  SURVEY_TRIGGER_TYPES,
  startSurveyResponseSchema,
  submitSurveyAnswerSchema,
} from "./schemas";

type Router = ReturnType<typeof httpRouter>;

export function registerSurveyRoutes(http: Router): void {
  // GET /api/v1/surveys/active - Get active survey for widget
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const survey = await ctx.runQuery(
        internal.surveys.responses.getActiveSurvey,
        {
          organizationId: auth.organizationId,
          triggerType: parseEnumParam(
            url.searchParams.get("triggerType"),
            SURVEY_TRIGGER_TYPES
          ),
        }
      );

      return jsonResponse(survey);
    }),
    method: "GET",
    path: "/api/v1/surveys/active",
  });

  // POST /api/v1/surveys/respond/start - Start a survey response
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, startSurveyResponseSchema);
      if (!body.success) {
        return body.response;
      }

      const responseId = await ctx.runMutation(
        internal.surveys.responses.startResponse,
        {
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          organizationId: auth.organizationId,
          pageUrl: body.data.pageUrl,
          respondentId: body.data.respondentId,
          surveyId: parseId<"surveys">(body.data.surveyId, "surveyId"),
          userAgent: body.data.userAgent,
        }
      );

      return jsonResponse({ responseId });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/start",
  });

  // POST /api/v1/surveys/respond/answer - Submit an answer
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, submitSurveyAnswerSchema);
      if (!body.success) {
        return body.response;
      }

      const answerId = await ctx.runMutation(
        internal.surveys.responses.submitAnswer,
        {
          organizationId: auth.organizationId,
          questionId: parseId<"surveyQuestions">(
            body.data.questionId,
            "questionId"
          ),
          responseId: parseId<"surveyResponses">(
            body.data.responseId,
            "responseId"
          ),
          value: body.data.value,
        }
      );

      return jsonResponse({ answerId });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/answer",
  });

  // POST /api/v1/surveys/respond/complete - Complete a survey response
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, completeSurveyResponseSchema);
      if (!body.success) {
        return body.response;
      }

      await ctx.runMutation(internal.surveys.responses.completeResponse, {
        organizationId: auth.organizationId,
        responseId: parseId<"surveyResponses">(
          body.data.responseId,
          "responseId"
        ),
      });

      return jsonResponse({ success: true });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/complete",
  });
}
