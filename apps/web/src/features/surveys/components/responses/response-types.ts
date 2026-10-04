import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type ResponseRow = FunctionReturnType<
  typeof api.surveys.queries.listResponses
>["page"][number];

export type SurveyDetail = NonNullable<
  FunctionReturnType<typeof api.surveys.queries.get>
>;

export type SurveyQuestionDetail = SurveyDetail["questions"][number];

const ANONYMOUS_ID_PREVIEW_LENGTH = 6;

export const respondentDisplayName = (
  respondent: ResponseRow["respondent"]
): string => {
  if (respondent.identified) {
    return respondent.name ?? respondent.email ?? respondent.id ?? "Anonymous";
  }
  return respondent.id
    ? `Anonymous · ${respondent.id.slice(0, ANONYMOUS_ID_PREVIEW_LENGTH)}`
    : "Anonymous";
};
