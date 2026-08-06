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

export function registerAdminSurveyRoutes(http: Router): void {
  http.route({
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
    method: "GET",
    path: "/api/v1/admin/surveys",
  });

  http.route({
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey.getSurvey, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/survey",
  });

  http.route({
    handler: adminPost((ctx, { organizationId }, body) => {
      const questions = Array.isArray(body.questions) ? body.questions : [];
      return ctx.runMutation(internal.admin_api.survey.createSurvey, {
        description: str(body.description),
        organizationId,
        questions: questions.map(
          (q: Record<string, unknown>, index: number) => ({
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
            description: str(q.description),
            order: (num(q.order) ?? index) as number,
            required: bool(q.required) ?? true,
            title: requireStr(q.title, "title"),
            type: requireStr(q.type, "type") as
              | "rating"
              | "nps"
              | "text"
              | "single_choice"
              | "multiple_choice"
              | "boolean",
          })
        ),
        title: requireStr(body.title, "title"),
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        triggerType: requireStr(body.triggerType, "triggerType") as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted",
      });
    }),
    method: "POST",
    path: "/api/v1/admin/survey/create",
  });

  http.route({
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurveyStatus, {
        status: requireStr(body.status, "status") as
          | "draft"
          | "active"
          | "paused"
          | "closed",
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/update-status",
  });

  http.route({
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey_lifecycle.deleteSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/delete",
  });

  http.route({
    handler: adminGet((ctx, _auth, url) =>
      ctx.runQuery(internal.admin_api.survey_results.getAnalytics, {
        surveyId: parseId<"surveys">(url.searchParams.get("id"), "id"),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/survey/analytics",
  });

  http.route({
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey_lifecycle.duplicateSurvey, {
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/duplicate",
  });

  http.route({
    handler: adminPost((ctx, _auth, body) =>
      ctx.runMutation(internal.admin_api.survey.updateSurvey, {
        description: str(body.description),
        maxResponses: num(body.maxResponses),
        surveyId: parseId<"surveys">(str(body.surveyId), "surveyId"),
        title: str(body.title),
        triggerConfig: body.triggerConfig as
          | {
              pageUrl?: string;
              delayMs?: number;
              sampleRate?: number;
            }
          | undefined,
        triggerType: str(body.triggerType) as
          | "manual"
          | "page_visit"
          | "time_delay"
          | "exit_intent"
          | "feedback_submitted"
          | undefined,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/survey/update",
  });

  http.route({
    handler: adminGet((ctx, _auth, url) => {
      const statusParam = url.searchParams.get("status");
      const limitParam = url.searchParams.get("limit");
      return ctx.runQuery(internal.admin_api.survey_results.listResponses, {
        limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
        status: (statusParam ?? undefined) as
          | "in_progress"
          | "completed"
          | "abandoned"
          | undefined,
        surveyId: parseId<"surveys">(
          requireStr(url.searchParams.get("id"), "id"),
          "id"
        ),
      });
    }),
    method: "GET",
    path: "/api/v1/admin/survey/responses",
  });

  // --- CORS preflight for all admin content routes ---
  for (const path of ADMIN_SURVEY_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
