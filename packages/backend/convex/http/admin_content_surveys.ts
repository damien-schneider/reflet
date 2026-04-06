import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import {
  adminGet,
  adminPost,
  bool,
  corsOptionsHandler,
  num,
  parseId,
  requireStr,
  str,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;

const ADMIN_CONTENT_SURVEY_PATHS = [
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

export function registerAdminContentSurveyRoutes(http: Router): void {
  // ============================================
  // SURVEYS
  // ============================================

  http.route({
    path: "/api/v1/admin/surveys",
    method: "GET",
    handler: adminGet((ctx, { organizationId }, url) => {
      const statusParam = url.searchParams.get("status");
      return ctx.runQuery(internal.admin_api.survey.listSurveys, {
        organizationId,
        status: (statusParam ?? undefined) as
          | "draft"
          | "active"
          | "paused"
          | "closed"
          | undefined,
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/survey",
    method: "GET",
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey.getSurvey, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/create",
    method: "POST",
    handler: adminPost((ctx, { organizationId }, body) => {
      const questions = Array.isArray(body.questions) ? body.questions : [];
      return ctx.runMutation(internal.admin_api.survey.createSurvey, {
        organizationId,
        title: requireStr(body.title, "title"),
        description: str(body.description),
        triggerType: requireStr(body.triggerType, "triggerType") as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted",
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        questions: questions.map(
          (q: Record<string, unknown>, index: number) => ({
            type: requireStr(q.type, "type") as
              | "rating"
              | "nps"
              | "text"
              | "single_choice"
              | "multiple_choice"
              | "boolean",
            title: requireStr(q.title, "title"),
            description: str(q.description),
            required: bool(q.required) ?? true,
            order: (num(q.order) ?? index) as number,
            config: q.config as
              | {
                  minValue?: number;
                  maxValue?: number;
                  minLabel?: string;
                  maxLabel?: string;
                  choices?: string[];
                  placeholder?: string;
                  maxLength?: number;
                }
              | undefined,
          })
        ),
      });
    }),
  });

  http.route({
    path: "/api/v1/admin/survey/update-status",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurveyStatus, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        status: requireStr(body.status, "status") as
          | "draft"
          | "active"
          | "paused"
          | "closed",
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/delete",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.deleteSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/analytics",
    method: "GET",
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey_analytics.getAnalytics, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/duplicate",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.duplicateSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/update",
    method: "POST",
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
        description: str(body.description),
        triggerType: str(body.triggerType) as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted"
          | undefined,
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        maxResponses: num(body.maxResponses),
      })
    ),
  });

  http.route({
    path: "/api/v1/admin/survey/responses",
    method: "GET",
    handler: adminGet((ctx, _auth, url) => {
      const statusParam = url.searchParams.get("status");
      const limitParam = url.searchParams.get("limit");
      return ctx.runQuery(internal.admin_api.survey_analytics.listResponses, {
        surveyId: parseId<"surveys">(
          requireStr(url.searchParams.get("id"), "id"),
          "id"
        ),
        status: (statusParam ?? undefined) as
          | "in_progress"
          | "completed"
          | "abandoned"
          | undefined,
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
      });
    }),
  });

  // --- CORS preflight for all admin content survey routes ---
  for (const path of ADMIN_CONTENT_SURVEY_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
