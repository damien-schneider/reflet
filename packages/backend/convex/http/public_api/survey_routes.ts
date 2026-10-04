import { TRIGGER_TYPES } from "@reflet/survey-core";
import type { HttpRouter } from "convex/server";
import { internal } from "../../_generated/api";
import { errorResponse, jsonResponse } from "../helpers";
import {
  type ApiAuthContext,
  checkWriteQuota,
  type PublicApiCtx,
  parseEnumParam,
} from "./auth";
import { publicApiRoute, readJsonBody } from "./route";
import {
  MAX_RESPONDENT_ID_LENGTH,
  startSurveyResponseSchema,
  submitSurveyAnswerSchema,
  surveyResponseIdSchema,
} from "./schemas";

const respondentIdParam = (url: URL): string | undefined =>
  url.searchParams.get("respondentId")?.slice(0, MAX_RESPONDENT_ID_LENGTH) ||
  undefined;

const checkSurveyStartQuota = (ctx: PublicApiCtx, auth: ApiAuthContext) =>
  checkWriteQuota(ctx, auth, "publicApiSurveyStartPerPublicKey");

const checkSurveyAnswerQuota = (ctx: PublicApiCtx, auth: ApiAuthContext) =>
  checkWriteQuota(ctx, auth, "publicApiSurveyAnswerPerPublicKey");

export function registerSurveyRoutes(http: HttpRouter): void {
  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const surveys = await ctx.runQuery(
        internal.surveys.responses.getEligibleSurveys,
        {
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          organizationId: auth.organizationId,
          respondentId: respondentIdParam(url),
        }
      );
      return jsonResponse({ surveys });
    }),
    method: "GET",
    path: "/api/v1/surveys/eligible",
  });

  http.route({
    handler: publicApiRoute(async ({ auth, ctx, url }) => {
      const survey = await ctx.runQuery(
        internal.surveys.responses.getActiveSurvey,
        {
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          organizationId: auth.organizationId,
          respondentId: respondentIdParam(url),
          surveyId: url.searchParams.get("surveyId") || undefined,
          triggerType: parseEnumParam(
            url.searchParams.get("triggerType"),
            TRIGGER_TYPES
          ),
        }
      );
      return jsonResponse(survey);
    }),
    method: "GET",
    path: "/api/v1/surveys/active",
  });

  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, startSurveyResponseSchema);
      if (!body.success) {
        return body.response;
      }
      const quota = await checkSurveyStartQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }
      const responseId = await ctx.runMutation(
        internal.surveys.responses.startResponse,
        {
          externalUserId: auth.externalUserId ?? auth.unverifiedExternalUserId,
          organizationId: auth.organizationId,
          pageUrl: body.data.pageUrl,
          respondentId: body.data.respondentId,
          surveyId: body.data.surveyId,
          userAgent: body.data.userAgent,
        }
      );
      return jsonResponse({ responseId });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/start",
  });

  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, submitSurveyAnswerSchema);
      if (!body.success) {
        return errorResponse(
          "questionId, responseId and a valid value are required",
          400
        );
      }
      const quota = await checkSurveyAnswerQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }
      const answerId = await ctx.runMutation(
        internal.surveys.responses.submitAnswer,
        {
          organizationId: auth.organizationId,
          questionId: body.data.questionId,
          responseId: body.data.responseId,
          value: body.data.value,
        }
      );
      return jsonResponse({ answerId });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/answer",
  });

  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, surveyResponseIdSchema);
      if (!body.success) {
        return body.response;
      }
      const quota = await checkSurveyAnswerQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }
      const { endingId } = await ctx.runMutation(
        internal.surveys.responses.completeResponse,
        {
          organizationId: auth.organizationId,
          responseId: body.data.responseId,
        }
      );
      return jsonResponse({ endingId, success: true });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/complete",
  });

  http.route({
    handler: publicApiRoute(async ({ auth, ctx, request }) => {
      const body = await readJsonBody(request, surveyResponseIdSchema);
      if (!body.success) {
        return body.response;
      }
      const quota = await checkSurveyStartQuota(ctx, auth);
      if (!quota.allowed) {
        return quota.response;
      }
      await ctx.runMutation(internal.surveys.responses.dismissResponse, {
        organizationId: auth.organizationId,
        responseId: body.data.responseId,
      });
      return jsonResponse({ success: true });
    }),
    method: "POST",
    path: "/api/v1/surveys/respond/dismiss",
  });
}
