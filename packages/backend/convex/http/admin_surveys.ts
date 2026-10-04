import type { HttpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import {
  adminCreateSurveySchema,
  adminUpdateSurveySchema,
  describeIssue,
} from "./admin_survey_schemas";
import {
  adminGet,
  adminPost,
  corsOptionsHandler,
  parseId,
  requireStr,
  str,
} from "./helpers";
import { parseEnumParam, parseIntParam } from "./public_api/auth";

const SURVEY_STATUSES = ["draft", "active", "paused", "closed"] as const;
const RESPONSE_STATUSES = ["in_progress", "completed", "abandoned"] as const;

const ADMIN_SURVEY_PATHS = [
  "/api/v1/admin/surveys",
  "/api/v1/admin/survey",
  "/api/v1/admin/survey/create",
  "/api/v1/admin/survey/update-status",
  "/api/v1/admin/survey/delete",
  "/api/v1/admin/survey/analytics",
  "/api/v1/admin/survey/duplicate",
  "/api/v1/admin/survey/update",
  "/api/v1/admin/survey/responses",
] as const;

export function registerAdminSurveyRoutes(http: HttpRouter): void {
  http.route({
    handler: adminGet((ctx, { organizationId }, url) =>
      ctx.runQuery(internal.admin_api.survey.listSurveys, {
        organizationId,
        status: parseEnumParam(url.searchParams.get("status"), SURVEY_STATUSES),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/surveys",
  });

  http.route({
    handler: adminGet((ctx, { organizationId }, url) =>
      ctx.runQuery(internal.admin_api.survey.getSurvey, {
        organizationId,
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/survey",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) => {
      const parsed = adminCreateSurveySchema.safeParse(body);
      if (!parsed.success) {
        throw new ConvexError(describeIssue(parsed.error));
      }
      return ctx.runMutation(internal.admin_api.survey.createSurvey, {
        ...parsed.data,
        organizationId,
      });
    }),
    method: "POST",
    path: "/api/v1/admin/survey/create",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) => {
      const status = parseEnumParam(str(body.status) ?? null, SURVEY_STATUSES);
      if (!status) {
        throw new ConvexError(
          `Invalid status: use one of ${SURVEY_STATUSES.join(", ")}`
        );
      }
      return ctx.runMutation(internal.admin_api.survey.updateSurveyStatus, {
        organizationId,
        status,
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      });
    }),
    method: "POST",
    path: "/api/v1/admin/survey/update-status",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.survey_lifecycle.deleteSurvey, {
        organizationId,
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/delete",
  });

  http.route({
    handler: adminGet((ctx, { organizationId }, url) =>
      ctx.runQuery(internal.admin_api.survey_results.getAnalytics, {
        organizationId,
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/survey/analytics",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) =>
      ctx.runMutation(internal.admin_api.survey_lifecycle.duplicateSurvey, {
        organizationId,
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/duplicate",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) => {
      const parsed = adminUpdateSurveySchema.safeParse(body);
      if (!parsed.success) {
        throw new ConvexError(describeIssue(parsed.error));
      }
      const { surveyId, ...settings } = parsed.data;
      return ctx.runMutation(internal.admin_api.survey.updateSurvey, {
        ...settings,
        organizationId,
        surveyId: parseId<"surveys">(surveyId, "surveyId"),
      });
    }),
    method: "POST",
    path: "/api/v1/admin/survey/update",
  });

  http.route({
    handler: adminGet((ctx, { organizationId }, url) =>
      ctx.runQuery(internal.admin_api.survey_results.listResponses, {
        cursor: url.searchParams.get("cursor"),
        limit: parseIntParam(url.searchParams.get("limit")),
        organizationId,
        status: parseEnumParam(
          url.searchParams.get("status"),
          RESPONSE_STATUSES
        ),
        surveyId: parseId<"surveys">(
          requireStr(url.searchParams.get("id"), "id"),
          "id"
        ),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/survey/responses",
  });

  // --- CORS preflight for all admin content routes ---
  for (const path of ADMIN_SURVEY_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
