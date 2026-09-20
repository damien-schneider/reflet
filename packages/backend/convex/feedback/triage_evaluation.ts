import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import {
  type Experimental_EvaluationModel as EvaluationModel,
  type Experimental_EvaluationQuestion as EvaluationQuestion,
  experimental_evaluate as evaluate,
} from "ai";
import type { Id } from "../_generated/dataModel";

const typeSafeAi = createTypeSafeAi({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const jev: EvaluationModel = typeSafeAi.evaluationModel("jev-1.13");

const USEFULNESS_QUESTION_ID = "usefulness";
const JUNK_QUESTION_ID = "junk";
const NEEDS_REVIEW_QUESTION_ID = "needsReview";
const TAG_QUESTION_PREFIX = "tag:";

const WITHHOLD_JUNK_THRESHOLD = 0.5;
const MIN_TAG_PROBABILITY = 0.65;
const MAX_TAGS_PER_FEEDBACK = 3;

export interface TriageTag {
  _id: Id<"tags">;
  description?: string;
  name: string;
}

export interface FeedbackTriage {
  junk: number;
  needsReview: number;
  tagIds: Id<"tags">[];
  usefulness: number;
  withhold: boolean;
}

export const isTriageConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

const buildQuestions = (tags: TriageTag[]) => {
  const questions: Record<string, EvaluationQuestion> = {
    [USEFULNESS_QUESTION_ID]: {
      criteria: {
        false:
          "Praise, thanks, or a remark with no problem or request attached, or content that is not about the product at all.",
        true: "A bug report, feature request, complaint, question, or suggestion a product team could act on.",
      },
      instructions:
        "Is this genuine product feedback that a product team could act on?",
      type: "boolean",
    },
    [JUNK_QUESTION_ID]: {
      criteria: {
        false:
          "Anything written in good faith by a real user about the product, including pure praise, thanks, complaints, and vague or low-effort reports.",
        true: "Advertising, promotional links, phishing, a throwaway test entry, empty filler, or gibberish with no meaning.",
      },
      instructions:
        "Should this submission be withheld from a public feedback board?",
      type: "boolean",
    },
    [NEEDS_REVIEW_QUESTION_ID]: {
      criteria: {
        false:
          "Self-contained: what happens, where it happens, and what the author wants are clear enough to act on as-is.",
        true: "A teammate would have to go back to the author first: the problem, the scope, or the desired outcome is missing, contradictory, or several unrelated requests are bundled together.",
      },
      instructions:
        "Does a teammate need to follow up with the author before this feedback can be acted on?",
      type: "boolean",
    },
  };

  for (const tag of tags) {
    questions[`${TAG_QUESTION_PREFIX}${tag._id}`] = {
      criteria: {
        false: `The feedback is not about ${tag.name}.`,
        true: `The feedback is clearly about ${tag.name}.`,
      },
      instructions: `Does this feedback belong to the "${tag.name}" category?${tag.description ? ` ${tag.name} covers: ${tag.description}.` : ""}`,
      type: "boolean",
    };
  }

  return questions;
};

export const evaluateFeedbackTriage = async (
  input: {
    description: string;
    tags: TriageTag[];
    title: string;
  },
  model: EvaluationModel = jev
): Promise<FeedbackTriage> => {
  const { answers } = await evaluate({
    model,
    questions: buildQuestions(input.tags),
    state: { description: input.description, title: input.title },
  });

  const probabilityOf = (questionId: string) => {
    const answer = answers[questionId];
    return answer?.type === "boolean" ? answer.probability : 0;
  };

  const usefulnessAnswer = answers[USEFULNESS_QUESTION_ID];
  const junkAnswer = answers[JUNK_QUESTION_ID];
  const needsReviewAnswer = answers[NEEDS_REVIEW_QUESTION_ID];
  if (
    usefulnessAnswer?.type !== "boolean" ||
    junkAnswer?.type !== "boolean" ||
    needsReviewAnswer?.type !== "boolean"
  ) {
    throw new Error(
      "Triage evaluation returned an incomplete verdict; refusing to route feedback"
    );
  }

  const tagIds = input.tags
    .map((tag) => ({
      probability: probabilityOf(`${TAG_QUESTION_PREFIX}${tag._id}`),
      tagId: tag._id,
    }))
    .filter((candidate) => candidate.probability >= MIN_TAG_PROBABILITY)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MAX_TAGS_PER_FEEDBACK)
    .map((candidate) => candidate.tagId);

  return {
    junk: junkAnswer.probability,
    needsReview: needsReviewAnswer.probability,
    tagIds,
    usefulness: usefulnessAnswer.probability,
    withhold: junkAnswer.probability >= WITHHOLD_JUNK_THRESHOLD,
  };
};
