import type { httpRouter } from "convex/server";
import { httpAction } from "../_generated/server";
import { corsPreflightResponse } from "./lib/api_helpers";
import { registerFeedbackReadRoutes } from "./public_api_feedback_reads";
import { registerFeedbackWriteRoutes } from "./public_api_feedback_writes";
import { registerSurveyRoutes } from "./public_api_surveys";

type Router = ReturnType<typeof httpRouter>;

const PUBLIC_API_PATHS = [
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
  // CORS preflight handler for all API routes
  for (const path of PUBLIC_API_PATHS) {
    http.route({
      path,
      method: "OPTIONS",
      handler: httpAction(async () => corsPreflightResponse()),
    });
  }

  registerFeedbackReadRoutes(http);
  registerFeedbackWriteRoutes(http);
  registerSurveyRoutes(http);
}
