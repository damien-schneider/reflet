/**
 * Shared enum constants for MCP tool input schemas.
 *
 * These mirror the canonical Convex validators in:
 *   - packages/backend/convex/shared/validators.ts
 *   - packages/backend/convex/surveys/tableFields.ts
 *
 * Keep these in sync with the Convex source of truth when adding/removing
 * status values. The Convex validators are the authoritative reference; this
 * file exists because the MCP server is a separate package and cannot import
 * the Convex validator instances (which produce values, not types/strings).
 */

import { z } from "zod";

// Mirrors `feedbackStatus` validator
export const feedbackStatusEnum = z.enum([
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
]);

// Mirrors `priorityValue` validator
export const priorityValueEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "none",
]);

// Mirrors `complexityValue` validator
export const complexityValueEnum = z.enum([
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
]);

// Mirrors `releaseFilterStatus` validator
export const releaseFilterStatusEnum = z.enum(["draft", "published", "all"]);

// Mirrors `milestoneFilterStatus` validator
export const milestoneFilterStatusEnum = z.enum([
  "active",
  "completed",
  "archived",
  "all",
]);

// Mirrors `surveyStatusValidator`
export const surveyStatusEnum = z.enum(["draft", "active", "paused", "closed"]);

/**
 * Survey response status as exposed by the MCP server.
 *
 * NOTE: The canonical Convex validator (`responseStatusValidator`) uses
 *   "in_progress" | "completed" | "abandoned"
 * but the MCP server has historically accepted "started" instead of
 * "in_progress". We preserve the MCP-facing value to avoid breaking existing
 * agent integrations. The client layer is expected to map "started" → the
 * stored value when needed. Do not silently align without coordinating both
 * sides.
 */
export const surveyResponseStatusMcpEnum = z.enum([
  "started",
  "completed",
  "abandoned",
]);

// Mirrors `triggerTypeValidator`
export const surveyTriggerTypeEnum = z.enum([
  "manual",
  "page_visit",
  "time_delay",
  "exit_intent",
  "feedback_submitted",
]);

// Mirrors `questionTypeValidator`
export const surveyQuestionTypeEnum = z.enum([
  "rating",
  "nps",
  "text",
  "single_choice",
  "multiple_choice",
  "boolean",
]);
