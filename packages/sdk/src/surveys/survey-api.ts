import type { AnswerValue, PublicSurvey } from "@reflet/survey-core";
import { getRespondentId } from "@reflet/survey-core/client";

export interface StartSurveyResponseParams {
  /** Page the survey was answered on. Defaults to the current page in a browser. */
  pageUrl?: string;
  surveyId: string;
}

export interface SubmitSurveyAnswerParams {
  questionId: string;
  responseId: string;
  /** `null` clears an answer the respondent emptied. */
  value: AnswerValue | null;
}

export interface StartSurveyResponseResult {
  responseId: string;
}

export interface SubmitSurveyAnswerResult {
  answerId: string | null;
}

export interface CompleteSurveyResponseResult {
  endingId: string;
}

/** The client's authenticated request, as the survey endpoints use it. */
export type ApiRequest = <Result>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
) => Promise<Result>;

/** Respondent endpoints of the public survey API. */
export interface SurveyApi {
  complete: (responseId: string) => Promise<CompleteSurveyResponseResult>;
  dismiss: (responseId: string) => Promise<void>;
  eligible: () => Promise<PublicSurvey[]>;
  start: (
    params: StartSurveyResponseParams
  ) => Promise<StartSurveyResponseResult>;
  submitAnswer: (
    params: SubmitSurveyAnswerParams
  ) => Promise<SubmitSurveyAnswerResult>;
}

/** The anonymous browser id that keeps display frequency and sampling stable. */
const browserRespondentId = (): string | undefined =>
  typeof window === "undefined" ? undefined : getRespondentId();

export const createSurveyApi = (request: ApiRequest): SurveyApi => ({
  complete: async (responseId) => {
    const { endingId } = await request<CompleteSurveyResponseResult>(
      "POST",
      "/api/v1/surveys/respond/complete",
      { responseId }
    );
    return { endingId };
  },
  dismiss: async (responseId) => {
    await request("POST", "/api/v1/surveys/respond/dismiss", { responseId });
  },
  eligible: async () => {
    const respondentId = browserRespondentId();
    const query = respondentId
      ? `?respondentId=${encodeURIComponent(respondentId)}`
      : "";
    const { surveys } = await request<{ surveys?: PublicSurvey[] }>(
      "GET",
      `/api/v1/surveys/eligible${query}`
    );
    return surveys ?? [];
  },
  start: ({ pageUrl, surveyId }) =>
    request("POST", "/api/v1/surveys/respond/start", {
      pageUrl:
        pageUrl ??
        (typeof window === "undefined" ? undefined : window.location.href),
      respondentId: browserRespondentId(),
      surveyId,
      userAgent:
        typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),
  submitAnswer: (params) =>
    request("POST", "/api/v1/surveys/respond/answer", params),
});
