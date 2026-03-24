import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerSurveyTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "survey_list",
    "List all surveys for the organization. Optionally filter by status (draft, active, paused, closed).",
    {
      status: z
        .enum(["draft", "active", "paused", "closed"])
        .optional()
        .describe("Filter surveys by status"),
    },
    async (params) =>
      textResult(
        await client.listSurveys(
          params.status ? { status: params.status } : undefined
        )
      )
  );

  server.tool(
    "survey_get",
    "Get detailed information about a specific survey, including all its questions and configuration.",
    {
      surveyId: z.string().describe("The survey ID to retrieve"),
    },
    async (params) => textResult(await client.getSurvey(params.surveyId))
  );

  server.tool(
    "survey_create",
    "Create a new survey with questions. Supports question types: rating, nps, text, single_choice, multiple_choice, boolean. Survey starts in draft status.",
    {
      title: z.string().describe("Survey title"),
      description: z.string().optional().describe("Survey description"),
      triggerType: z
        .enum([
          "manual",
          "page_visit",
          "time_delay",
          "exit_intent",
          "feedback_submitted",
        ])
        .describe("When the survey should be triggered"),
      triggerConfig: z
        .object({
          pageUrl: z.string().optional(),
          delayMs: z.number().optional(),
          sampleRate: z.number().optional(),
        })
        .optional()
        .describe("Trigger-specific configuration"),
      questions: z
        .array(
          z.object({
            type: z.enum([
              "rating",
              "nps",
              "text",
              "single_choice",
              "multiple_choice",
              "boolean",
            ]),
            title: z.string(),
            description: z.string().optional(),
            required: z.boolean().optional().default(true),
            order: z.number().optional(),
            config: z
              .object({
                minValue: z.number().optional(),
                maxValue: z.number().optional(),
                minLabel: z.string().optional(),
                maxLabel: z.string().optional(),
                choices: z.array(z.string()).optional(),
                placeholder: z.string().optional(),
                maxLength: z.number().optional(),
              })
              .optional(),
          })
        )
        .describe("Array of survey questions"),
    },
    async (params) => textResult(await client.createSurvey(params))
  );

  server.tool(
    "survey_update_status",
    "Update a survey's status. Valid transitions: draft→active, active→paused, paused→active, any→closed.",
    {
      surveyId: z.string().describe("The survey ID to update"),
      status: z
        .enum(["draft", "active", "paused", "closed"])
        .describe("The new status"),
    },
    async (params) =>
      textResult(
        await client.updateSurveyStatus(params.surveyId, params.status)
      )
  );

  server.tool(
    "survey_delete",
    "Permanently delete a survey and all its questions, responses, and answers. This action cannot be undone.",
    {
      surveyId: z.string().describe("The survey ID to delete"),
    },
    async (params) => textResult(await client.deleteSurvey(params.surveyId))
  );

  server.tool(
    "survey_analytics",
    "Get analytics for a survey including response counts, completion rate, and per-question statistics (averages, distributions).",
    {
      surveyId: z.string().describe("The survey ID to get analytics for"),
    },
    async (params) =>
      textResult(await client.getSurveyAnalytics(params.surveyId))
  );

  server.tool(
    "survey_duplicate",
    "Create a copy of an existing survey with all its questions. The copy starts in draft status.",
    {
      surveyId: z.string().describe("The survey ID to duplicate"),
      title: z
        .string()
        .optional()
        .describe(
          "Optional title for the copy. Defaults to 'Copy of <original title>'"
        ),
    },
    async (params) =>
      textResult(await client.duplicateSurvey(params.surveyId, params.title))
  );

  server.tool(
    "survey_update",
    "Update a survey's settings (title, description, trigger, max responses). Does not change status — use survey_update_status for that.",
    {
      surveyId: z.string().describe("The survey ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      triggerType: z
        .enum([
          "manual",
          "page_visit",
          "time_delay",
          "exit_intent",
          "feedback_submitted",
        ])
        .optional()
        .describe("New trigger type"),
      triggerConfig: z
        .object({
          pageUrl: z.string().optional(),
          delayMs: z.number().optional(),
          sampleRate: z.number().optional(),
        })
        .optional()
        .describe("New trigger-specific configuration"),
      maxResponses: z
        .number()
        .optional()
        .describe("Maximum number of responses to collect"),
    },
    async (params) => textResult(await client.updateSurvey(params))
  );

  server.tool(
    "survey_responses",
    "List responses for a survey. Optionally filter by status (started, completed, abandoned).",
    {
      surveyId: z.string().describe("The survey ID to list responses for"),
      status: z
        .enum(["started", "completed", "abandoned"])
        .optional()
        .describe("Filter responses by status"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of responses to return"),
    },
    async (params) =>
      textResult(
        await client.listSurveyResponses(params.surveyId, {
          status: params.status,
          limit: params.limit,
        })
      )
  );
}
