import type { Id } from "../_generated/dataModel";

export const TRIAGE_MODEL = "jev-1.13";
export const TRIAGE_CRITERIA_VERSION = "product-triage/1";
export const TRIAGE_INPUT_VERSION = "title-description/1";

export const USEFULNESS_QUESTION_ID = "usefulness";
export const JUNK_QUESTION_ID = "junk";
export const NEEDS_REVIEW_QUESTION_ID = "needsReview";
export const TAG_QUESTION_PREFIX = "tag:";

export const WITHHOLD_JUNK_THRESHOLD = 0.5;
export const MIN_TAG_PROBABILITY = 0.65;
export const MAX_TAGS_PER_FEEDBACK = 3;

export interface TriageTag {
  _id: Id<"tags">;
  description?: string;
  name: string;
}

const PRODUCT_QUESTIONS: Record<
  string,
  {
    criteria: { false: string; true: string };
    instructions: string;
    type: "boolean";
  }
> = {
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

export const buildQuestions = (tags: TriageTag[]) => {
  const questions = { ...PRODUCT_QUESTIONS };
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
