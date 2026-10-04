import type { SurveyTransport } from "@reflet/survey-core/client";
import type { Reflet } from "../client";

/** Runs a survey session against the Reflet REST API with this client's key and user. */
export const createRefletSurveyTransport = (
  client: Reflet,
  options: { pageUrl?: string } = {}
): SurveyTransport => ({
  answer: (input) => client.submitSurveyAnswer(input),
  complete: ({ responseId }) => client.completeSurveyResponse(responseId),
  dismiss: ({ responseId }) => client.dismissSurveyResponse(responseId),
  start: ({ surveyId }) =>
    client.startSurveyResponse({ pageUrl: options.pageUrl, surveyId }),
});
