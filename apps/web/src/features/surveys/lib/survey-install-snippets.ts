import type { TriggerConfig, TriggerType } from "@reflet/survey-core";

export const WIDGET_SCRIPT_URL =
  "https://www.reflet.app/widget/reflet-feedback.v1.js";
export const PUBLIC_KEY_PLACEHOLDER = "fb_pub_xxx";
export const EVENT_NAME_PLACEHOLDER = "your_event_name";
export const WIDGET_INSTANCE_GLOBAL = "window.__refletFeedbackWidgetInstance";

export interface InstallTarget {
  _id: string;
  triggerConfig?: TriggerConfig;
  triggerType: TriggerType;
}

/** The method + literal argument your code calls to show this survey; null when its trigger fires on its own. */
export interface TriggerCall {
  argument: string;
  method: "showSurvey" | "track";
}

export const eventNameOf = (survey: InstallTarget): string | null =>
  survey.triggerConfig?.eventName?.trim() || null;

export const triggerCallOf = (survey: InstallTarget): TriggerCall | null => {
  if (survey.triggerType === "manual") {
    return { argument: JSON.stringify(survey._id), method: "showSurvey" };
  }
  if (survey.triggerType === "event") {
    const eventName = eventNameOf(survey) ?? EVENT_NAME_PLACEHOLDER;
    return { argument: JSON.stringify(eventName), method: "track" };
  }
  return null;
};

export const scriptTagSnippet = (publicKey: string): string => `<script
  src="${WIDGET_SCRIPT_URL}"
  data-public-key="${publicKey}"
  defer
></script>`;

export const reactSdkSnippet = (
  publicKey: string
): string => `import { RefletProvider, RefletSurveys } from "reflet-sdk/react";

export function SurveysProvider({ children }) {
  return (
    <RefletProvider publicKey="${publicKey}">
      {children}
      <RefletSurveys />
    </RefletProvider>
  );
}`;

export const scriptTriggerSnippet = ({ argument, method }: TriggerCall) =>
  `${WIDGET_INSTANCE_GLOBAL}?.${method}(${argument});`;

export const sdkTriggerSnippet = ({
  argument,
  method,
}: TriggerCall) => `import { useRefletSurveys } from "reflet-sdk/react";

const { ${method} } = useRefletSurveys();
${method}(${argument});`;
