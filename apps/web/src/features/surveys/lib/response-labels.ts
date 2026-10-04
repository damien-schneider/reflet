import type { BadgeColor } from "@ctrl-ui/react/ui/badge";
import type { AnswerValue } from "@reflet/survey-core";

export type ResponseStatus = "in_progress" | "completed" | "abandoned";

export type ResponseChannel = "in_app" | "link";

export const RESPONSE_STATUS_LABELS = {
  abandoned: "Abandoned",
  completed: "Completed",
  in_progress: "In progress",
} as const satisfies Record<ResponseStatus, string>;

export const RESPONSE_STATUS_COLORS = {
  abandoned: "neutral",
  completed: "green",
  in_progress: "blue",
} as const satisfies Record<ResponseStatus, BadgeColor>;

export const RESPONSE_CHANNEL_LABELS = {
  in_app: "In app",
  link: "Link",
} as const satisfies Record<ResponseChannel, string>;

export const formatAnswerValue = (value: AnswerValue): string => {
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
};
