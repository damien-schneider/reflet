import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import {
  type Experimental_EvaluationModel as EvaluationModel,
  experimental_evaluate as evaluate,
} from "ai";
import type { Id } from "../_generated/dataModel";

const typeSafeAi = createTypeSafeAi({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const jev: EvaluationModel = typeSafeAi.evaluationModel(TRIAGE_MODEL);

import {
  buildQuestions,
  JUNK_QUESTION_ID,
  MAX_TAGS_PER_FEEDBACK,
  MIN_TAG_PROBABILITY,
  NEEDS_REVIEW_QUESTION_ID,
  TAG_QUESTION_PREFIX,
  TRIAGE_MODEL,
  type TriageTag,
  USEFULNESS_QUESTION_ID,
  WITHHOLD_JUNK_THRESHOLD,
} from "./triage_questions";
export interface FeedbackTriage {
  answers: { questionId: string; probability: number }[];
  junk: number;
  needsReview: number;
  tagIds: Id<"tags">[];
  usefulness: number;
  withhold: boolean;
}

export const isTriageConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

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
    if (
      answer?.type !== "boolean" ||
      !Number.isFinite(answer.probability) ||
      answer.probability < 0 ||
      answer.probability > 1
    ) {
      throw new Error(`Missing or invalid triage answer: ${questionId}`);
    }
    return answer.probability;
  };
  for (const questionId of Object.keys(buildQuestions(input.tags))) {
    probabilityOf(questionId);
  }

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
    answers: Object.entries(answers).map(([questionId, answer]) => {
      if (
        answer.type !== "boolean" ||
        !Number.isFinite(answer.probability) ||
        answer.probability < 0 ||
        answer.probability > 1
      ) {
        throw new Error("Invalid triage probability");
      }
      return { probability: answer.probability, questionId };
    }),
    junk: junkAnswer.probability,
    needsReview: needsReviewAnswer.probability,
    tagIds,
    usefulness: usefulnessAnswer.probability,
    withhold: junkAnswer.probability >= WITHHOLD_JUNK_THRESHOLD,
  };
};
