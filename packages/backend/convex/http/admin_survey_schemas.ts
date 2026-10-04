import {
  DISPLAY_FREQUENCIES,
  LOGIC_OPERATORS,
  QUESTION_TYPES,
  RATING_STYLES,
  SURVEY_POSITIONS,
  safeLinkUrl,
  TRIGGER_TYPES,
} from "@reflet/survey-core";
import { z } from "zod";
import { UNSAFE_BUTTON_LINK_MESSAGE } from "../surveys/editing/button_links";

const buttonUrlSchema = z
  .string()
  .refine((url) => url === "" || safeLinkUrl(url) !== null, {
    message: UNSAFE_BUTTON_LINK_MESSAGE,
  })
  .optional();

const draftTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("question"), questionIndex: z.number().int() }),
  z.object({ endingId: z.string(), kind: z.literal("ending") }),
]);

const questionConfigSchema = z.object({
  allowOther: z.boolean().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: buttonUrlSchema,
  choices: z.array(z.string()).optional(),
  maxLabel: z.string().optional(),
  maxLength: z.number().optional(),
  maxValue: z.number().optional(),
  minLabel: z.string().optional(),
  minValue: z.number().optional(),
  placeholder: z.string().optional(),
  ratingStyle: z.enum(RATING_STYLES).optional(),
});

const questionDraftSchema = z.object({
  config: questionConfigSchema.optional(),
  description: z.string().optional(),
  logic: z
    .array(
      z.object({
        id: z.string(),
        operator: z.enum(LOGIC_OPERATORS),
        target: draftTargetSchema,
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      })
    )
    .optional(),
  next: draftTargetSchema.optional(),
  required: z.boolean().default(true),
  title: z.string(),
  type: z.enum(QUESTION_TYPES),
});

const triggerConfigSchema = z.object({
  delayMs: z.number().optional(),
  eventName: z.string().optional(),
  pageUrl: z.string().optional(),
  sampleRate: z.number().min(0).max(100).optional(),
});

const displaySchema = z.object({
  frequency: z.enum(DISPLAY_FREQUENCIES),
  position: z.enum(SURVEY_POSITIONS).optional(),
  recontactDays: z.number().min(0).optional(),
});

const endingSchema = z.object({
  buttonLabel: z.string().optional(),
  buttonUrl: buttonUrlSchema,
  description: z.string().optional(),
  id: z.string(),
  title: z.string(),
});

export const adminCreateSurveySchema = z.object({
  description: z.string().optional(),
  display: displaySchema.optional(),
  endings: z.array(endingSchema).optional(),
  questions: z.array(questionDraftSchema).default([]),
  title: z.string(),
  triggerConfig: triggerConfigSchema.optional(),
  triggerType: z.enum(TRIGGER_TYPES),
});

export const adminUpdateSurveySchema = z.object({
  description: z.string().optional(),
  display: displaySchema.optional(),
  endings: z.array(endingSchema).optional(),
  endsAt: z.number().nullable().optional(),
  linkEnabled: z.boolean().optional(),
  maxResponses: z.number().nullable().optional(),
  startsAt: z.number().nullable().optional(),
  surveyId: z.string(),
  title: z.string().optional(),
  triggerConfig: triggerConfigSchema.optional(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
});

/** Turns a schema failure into a readable 400 message naming the offending field. */
export const describeIssue = (error: z.ZodError): string => {
  const [issue] = error.issues;
  if (!issue) {
    return "Invalid request body";
  }
  const path = issue.path.join(".");
  return path ? `Invalid ${path}: ${issue.message}` : issue.message;
};
