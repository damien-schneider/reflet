const PRO_SUBSCRIPTION_ERROR = "Autopilot requires a Pro subscription";
const CONVEX_ERROR_MARKER = "[CONVEX";
const CONVEX_UNCAUGHT_ERROR_PATTERN =
  /Uncaught Error:\s*(?<detail>.*?)(?=\s+at\s+[\w.$<>]+\s*\(|\n\s*at\s+|$)/s;

export const AUTOPILOT_PRO_REQUIRED_MESSAGE =
  "Autopilot requires a Pro subscription. Open Billing to upgrade or restore your subscription.";

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

function getCleanConvexErrorMessage(message: string) {
  const match = message.match(CONVEX_UNCAUGHT_ERROR_PATTERN);
  return match?.groups?.detail?.trim() ?? "";
}

export function getAutopilotErrorMessage(
  error: unknown,
  options: {
    fallback: string;
    proAccessMessage?: string;
  }
) {
  const rawMessage = getRawErrorMessage(error).trim();
  const convexMessage = getCleanConvexErrorMessage(rawMessage);
  const message = convexMessage || rawMessage;

  if (message.includes(PRO_SUBSCRIPTION_ERROR)) {
    return options.proAccessMessage ?? AUTOPILOT_PRO_REQUIRED_MESSAGE;
  }

  if (
    !message ||
    (rawMessage.includes(CONVEX_ERROR_MARKER) && !convexMessage)
  ) {
    return options.fallback;
  }

  return message;
}
