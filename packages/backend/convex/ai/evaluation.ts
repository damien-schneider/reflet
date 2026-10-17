import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import type { Experimental_EvaluationModel as EvaluationModel } from "ai";
import { EVALUATION_MODEL } from "./models";

const typeSafeAi = createTypeSafeAi({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const jev: EvaluationModel =
  typeSafeAi.evaluationModel(EVALUATION_MODEL);
