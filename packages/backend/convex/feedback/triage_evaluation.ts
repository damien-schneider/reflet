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
const TAG_QUESTION_PREFIX = "tag:";

const REVIEW_USEFULNESS_THRESHOLD = 0.5;
const MIN_TAG_PROBABILITY = 0.65;
const MAX_TAGS_PER_FEEDBACK = 3;

export interface TriageTag {
  _id: Id<"tags">;
  description?: string;
  name: string;
}

export interface FeedbackTriage {
  needsReview: boolean;
  tagIds: Id<"tags">[];
  usefulness: number;
}

export const isTriageConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

const buildQuestions = (tags: TriageTag[]) => {
  const questions: Record<string, EvaluationQuestion> = {
    [USEFULNESS_QUESTION_ID]: {
      criteria: {
        false:
          "Spam, advertising, a test entry, gibberish, an empty placeholder, or praise with no problem or request attached.",
        true: "A bug report, feature request, complaint, question, or suggestion a product team could act on.",
      },
      instructions:
        "Is this genuine product feedback that a product team could act on?",
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
  if (usefulnessAnswer?.type !== "boolean") {
    throw new Error(
      "Triage evaluation returned no usefulness answer; refusing to route feedback"
    );
  }
  const usefulness = usefulnessAnswer.probability;

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
    needsReview: usefulness < REVIEW_USEFULNESS_THRESHOLD,
    tagIds,
    usefulness,
  };
};
