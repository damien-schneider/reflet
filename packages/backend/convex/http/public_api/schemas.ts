import { z } from "zod";

const pointSchema = z.object({ x: z.number(), y: z.number() });

/**
 * Widget-reported context. Every bound is a hard cap on what a public client
 * can push into the database, not just a shape check.
 */
const feedbackContextSchema = z.object({
  browser: z.string().max(120).optional(),
  consoleEvents: z
    .array(
      z.object({
        level: z.enum(["error", "warn"]),
        message: z.string().max(1000),
        timestamp: z.number(),
      })
    )
    .max(30)
    .optional(),
  device: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  metadata: z.record(z.string().max(60), z.string().max(500)).optional(),
  os: z.string().max(60).optional(),
  pageTitle: z.string().max(300).optional(),
  referrer: z.string().max(2000).optional(),
  screen: z.object({ height: z.number(), width: z.number() }).optional(),
  sdkVersion: z.string().max(40).optional(),
  selection: z
    .object({
      componentStack: z.array(z.string().max(120)).max(10),
      html: z.string().max(2000),
      label: z.string().max(200),
      rect: z.object({
        height: z.number(),
        width: z.number(),
        x: z.number(),
        y: z.number(),
      }),
      region: z.string().max(200).optional(),
      selector: z.string().max(600),
      sourceLocation: z.string().max(400).optional(),
    })
    .optional(),
  timezone: z.string().max(80).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(600).optional(),
  viewport: z
    .object({
      devicePixelRatio: z.number(),
      height: z.number(),
      width: z.number(),
    })
    .optional(),
});

export const createFeedbackSchema = z.object({
  context: feedbackContextSchema.optional(),
  description: z.string().optional(),
  tagId: z.string().optional(),
  title: z.string().optional(),
});

const screenshotAnnotationSchema = z.object({
  color: z.string().max(40).optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  height: z.number().optional(),
  points: z.array(pointSchema).max(500).optional(),
  text: z.string().max(280).optional(),
  type: z.enum(["rectangle", "arrow", "text", "blur", "pen", "highlight"]),
  width: z.number().optional(),
  x: z.number(),
  y: z.number(),
});

export const saveScreenshotSchema = z.object({
  annotatedStorageId: z.string().optional(),
  annotations: z.array(screenshotAnnotationSchema).max(50).optional(),
  /** Public clients may only claim what the widget itself can capture. */
  captureSource: z.enum(["widget", "element"]).optional(),
  feedbackId: z.string(),
  filename: z.string().max(200).optional(),
  height: z.number().optional(),
  mimeType: z.string().max(80).optional(),
  pageUrl: z.string().max(2000).optional(),
  size: z.number().optional(),
  storageId: z.string(),
  width: z.number().optional(),
});

export const voteFeedbackSchema = z.object({
  feedbackId: z.string().optional(),
  voteType: z.enum(["upvote", "downvote"]).optional(),
});

export const commentBodySchema = z.object({
  body: z.string().optional(),
  feedbackId: z.string().optional(),
  parentId: z.string().optional(),
});

export const feedbackIdBodySchema = z.object({
  feedbackId: z.string().optional(),
});

const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const startSurveyResponseSchema = z.object({
  pageUrl: z.string().max(2000).optional(),
  respondentId: z.string().max(200).optional(),
  surveyId: z.string(),
  userAgent: z.string().max(600).optional(),
});

export const submitSurveyAnswerSchema = z.object({
  questionId: z.string(),
  responseId: z.string(),
  value: answerValueSchema,
});

export const completeSurveyResponseSchema = z.object({
  responseId: z.string(),
});

export const SURVEY_TRIGGER_TYPES = [
  "manual",
  "page_visit",
  "time_delay",
  "exit_intent",
  "feedback_submitted",
] as const;

export const FEEDBACK_STATUSES = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
] as const;

export const FEEDBACK_SORT_OPTIONS = [
  "votes",
  "newest",
  "oldest",
  "comments",
] as const;

export const COMMENTS_SORT_OPTIONS = ["newest", "oldest"] as const;
