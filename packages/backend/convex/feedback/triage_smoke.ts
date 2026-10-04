import { internalAction } from "../_generated/server";
import {
  evaluateFeedbackTriage,
  isTriageConfigured,
} from "./triage_evaluation";

const SMOKE_SUBMISSION = {
  description:
    "Every invoice PDF we download is missing the VAT line, so accounting rejects them.",
  tags: [],
  title: "Invoices unusable",
};

export const run = internalAction({
  args: {},
  handler: async () => {
    if (!isTriageConfigured()) {
      throw new Error("OPENROUTER_API_KEY is not set in this deployment");
    }
    return await evaluateFeedbackTriage(SMOKE_SUBMISSION);
  },
});
