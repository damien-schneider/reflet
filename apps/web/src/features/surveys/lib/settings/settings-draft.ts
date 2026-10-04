import type { api } from "@reflet/backend/convex/_generated/api";
import {
  DEFAULT_RECONTACT_DAYS,
  DEFAULT_TIME_DELAY_MS,
  type DisplayFrequency,
  type SurveyPosition,
  type TriggerConfig,
  type TriggerType,
} from "@reflet/survey-core";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

const MS_PER_SECOND = 1000;
const FULL_SAMPLE_PERCENT = 100;

export type SurveyDetail = NonNullable<
  FunctionReturnType<typeof api.surveys.queries.get>
>;

export type SettingsSurvey = Pick<
  SurveyDetail,
  | "_id"
  | "description"
  | "display"
  | "endsAt"
  | "maxResponses"
  | "startsAt"
  | "title"
  | "triggerConfig"
  | "triggerType"
>;

export type SurveySettingsUpdate = FunctionArgs<
  typeof api.surveys.mutations.update
>;

export interface SettingsDraft {
  delaySeconds: string;
  description: string;
  endsAt: number | null;
  eventName: string;
  frequency: DisplayFrequency;
  maxResponses: string;
  pageUrl: string;
  position: SurveyPosition;
  recontactDays: string;
  sampleRate: string;
  startsAt: number | null;
  title: string;
  triggerType: TriggerType;
}

export type SettingsField =
  | "delaySeconds"
  | "endsAt"
  | "eventName"
  | "maxResponses"
  | "recontactDays"
  | "sampleRate"
  | "title";

export type SettingsIssues = Partial<Record<SettingsField, string>>;

export const takesRecontactDays = (frequency: DisplayFrequency): boolean =>
  frequency !== "once";

/** Manual surveys open only through `showSurvey`, which ignores the page filter. */
export const takesPageUrl = (triggerType: TriggerType): boolean =>
  triggerType !== "manual";

export function toSettingsDraft(survey: SettingsSurvey): SettingsDraft {
  const { display, triggerConfig } = survey;
  const delayMs = triggerConfig?.delayMs ?? DEFAULT_TIME_DELAY_MS;
  return {
    delaySeconds: String(delayMs / MS_PER_SECOND),
    description: survey.description ?? "",
    endsAt: survey.endsAt ?? null,
    eventName: triggerConfig?.eventName ?? "",
    frequency: display.frequency,
    maxResponses: survey.maxResponses?.toString() ?? "",
    pageUrl: triggerConfig?.pageUrl ?? "",
    position: display.position ?? "bottom_right",
    recontactDays: String(display.recontactDays ?? DEFAULT_RECONTACT_DAYS),
    sampleRate: String(triggerConfig?.sampleRate ?? FULL_SAMPLE_PERCENT),
    startsAt: survey.startsAt ?? null,
    title: survey.title,
    triggerType: survey.triggerType,
  };
}

const parseWholeNumber = (value: string): number | null => {
  const parsed = Number(value.trim());
  return value.trim() !== "" && Number.isInteger(parsed) ? parsed : null;
};

function triggerIssues(draft: SettingsDraft): SettingsIssues {
  if (draft.triggerType === "event" && draft.eventName.trim() === "") {
    return { eventName: "Name the event that shows this survey." };
  }
  const delay = Number(draft.delaySeconds.trim());
  const delayIsValid =
    draft.delaySeconds.trim() !== "" && Number.isFinite(delay) && delay >= 0;
  if (draft.triggerType === "time_delay" && !delayIsValid) {
    return { delaySeconds: "Enter a delay of 0 seconds or more." };
  }
  return {};
}

function audienceIssues(draft: SettingsDraft): SettingsIssues {
  const issues: SettingsIssues = {};
  const recontactDays = parseWholeNumber(draft.recontactDays);
  if (
    takesRecontactDays(draft.frequency) &&
    (recontactDays === null || recontactDays < 1)
  ) {
    issues.recontactDays = "Enter a whole number of days, 1 or more.";
  }
  const sampleRate = parseWholeNumber(draft.sampleRate);
  if (
    sampleRate === null ||
    sampleRate < 1 ||
    sampleRate > FULL_SAMPLE_PERCENT
  ) {
    issues.sampleRate = "Enter a whole percentage from 1 to 100.";
  }
  const maxResponses = parseWholeNumber(draft.maxResponses);
  if (
    draft.maxResponses.trim() !== "" &&
    (maxResponses === null || maxResponses < 1)
  ) {
    issues.maxResponses = "Enter a whole number above 0, or leave it empty.";
  }
  if (
    draft.startsAt !== null &&
    draft.endsAt !== null &&
    draft.endsAt <= draft.startsAt
  ) {
    issues.endsAt = "The end date must come after the start date.";
  }
  return issues;
}

export function settingsIssues(draft: SettingsDraft): SettingsIssues {
  return {
    ...(draft.title.trim() === "" ? { title: "Give the survey a title." } : {}),
    ...triggerIssues(draft),
    ...audienceIssues(draft),
  };
}

function toTriggerConfig(draft: SettingsDraft): TriggerConfig {
  const sampleRate = Number(draft.sampleRate.trim());
  const pageUrl = draft.pageUrl.trim();
  return {
    ...(draft.triggerType === "time_delay"
      ? {
          delayMs: Math.round(
            Number(draft.delaySeconds.trim()) * MS_PER_SECOND
          ),
        }
      : {}),
    ...(draft.triggerType === "event"
      ? { eventName: draft.eventName.trim() }
      : {}),
    ...(pageUrl && takesPageUrl(draft.triggerType) ? { pageUrl } : {}),
    ...(sampleRate < FULL_SAMPLE_PERCENT ? { sampleRate } : {}),
  };
}

/** Maps a valid draft to the update payload; `null` clears the cap and schedule dates. */
export function settingsToUpdate(
  draft: SettingsDraft,
  survey: Pick<SettingsSurvey, "_id">
): SurveySettingsUpdate {
  const maxResponses = draft.maxResponses.trim();
  return {
    description: draft.description.trim(),
    display: {
      frequency: draft.frequency,
      position: draft.position,
      ...(takesRecontactDays(draft.frequency)
        ? { recontactDays: Number(draft.recontactDays.trim()) }
        : {}),
    },
    endsAt: draft.endsAt,
    maxResponses: maxResponses === "" ? null : Number(maxResponses),
    startsAt: draft.startsAt,
    surveyId: survey._id,
    title: draft.title.trim(),
    triggerConfig: toTriggerConfig(draft),
    triggerType: draft.triggerType,
  };
}
