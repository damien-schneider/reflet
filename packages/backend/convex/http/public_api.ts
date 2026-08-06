import type { httpRouter } from "convex/server";
import { httpAction } from "../_generated/server";
import { corsPreflightResponse } from "./helpers";
import { registerFeedbackReadRoutes } from "./public_api/feedback_read";
import { registerFeedbackWriteRoutes } from "./public_api/feedback_write";
import { registerSurveyRoutes } from "./public_api/survey_routes";

type Router = ReturnType<typeof httpRouter>;

const CORS_PREFLIGHT_PATHS = [
  "/api/v1/feedback",
  "/api/v1/feedback/list",
  "/api/v1/feedback/item",
  "/api/v1/feedback/create",
  "/api/v1/feedback/vote",
  "/api/v1/feedback/comments",
  "/api/v1/feedback/comment",
  "/api/v1/feedback/subscribe",
  "/api/v1/feedback/unsubscribe",
  "/api/v1/feedback/roadmap",
  "/api/v1/feedback/changelog",
  "/api/v1/feedback/similar",
  "/api/v1/feedback/screenshot/upload-url",
  "/api/v1/feedback/screenshot/save",
  "/api/v1/surveys/active",
  "/api/v1/surveys/respond/start",
  "/api/v1/surveys/respond/answer",
  "/api/v1/surveys/respond/complete",
] as const;

export function registerPublicApiRoutes(http: Router): void {
  for (const path of CORS_PREFLIGHT_PATHS) {
    http.route({
      handler: httpAction(async () => corsPreflightResponse()),
      method: "OPTIONS",
      path,
    });
  }

  registerFeedbackReadRoutes(http);
  registerFeedbackWriteRoutes(http);
  registerSurveyRoutes(http);
}
