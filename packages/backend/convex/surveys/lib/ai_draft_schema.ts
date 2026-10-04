import {
  LOGIC_OPERATORS,
  QUESTION_TYPES,
  RATING_STYLES,
} from "@reflet/survey-core";
import { type Infer, v } from "convex/values";
import { z } from "zod";
import { questionDraftValidator } from "../tableFields";

const generatedTargetSchema = z.object({
  endingId: z
    .string()
    .optional()
    .describe('Only for kind "ending": always "default"'),
  kind: z.enum(["question", "ending"]),
  questionIndex: z
    .number()
    .optional()
    .describe('Only for kind "question": 0-based index of a LATER question'),
});

const generatedRuleSchema = z.object({
  operator: z.enum(LOGIC_OPERATORS),
  target: generatedTargetSchema,
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("Omit for answered/skipped"),
});

const generatedConfigSchema = z.object({
  allowOther: z.boolean().optional(),
  buttonLabel: z.string().optional(),
  choices: z.array(z.string()).optional(),
  maxLabel: z.string().optional(),
  maxValue: z.number().optional(),
  minLabel: z.string().optional(),
  minValue: z.number().optional(),
  placeholder: z.string().optional(),
  ratingStyle: z.enum(RATING_STYLES).optional(),
});

const generatedQuestionSchema = z.object({
  config: generatedConfigSchema.optional(),
  description: z.string().optional(),
  logic: z.array(generatedRuleSchema).optional(),
  next: generatedTargetSchema.optional(),
  required: z.boolean(),
  title: z.string(),
  type: z.enum(QUESTION_TYPES),
});

export const generatedDraftSchema = z.object({
  description: z
    .string()
    .optional()
    .describe("One short sentence shown to respondents above the questions"),
  questions: z.array(generatedQuestionSchema),
  title: z.string().describe("Short internal name for the survey"),
});

export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;
export type GeneratedQuestion = GeneratedDraft["questions"][number];
export type GeneratedTarget = z.infer<typeof generatedTargetSchema>;
export type GeneratedRule = z.infer<typeof generatedRuleSchema>;

export const surveyDraftValidator = v.object({
  description: v.optional(v.string()),
  questions: v.array(questionDraftValidator),
  title: v.string(),
});

export type SurveyDraft = Infer<typeof surveyDraftValidator>;
export type QuestionDraft = SurveyDraft["questions"][number];
export type DraftTarget = NonNullable<QuestionDraft["next"]>;
export type DraftRule = NonNullable<QuestionDraft["logic"]>[number];
export type DraftConfig = NonNullable<QuestionDraft["config"]>;
