import { toast } from "@ctrl-ui/react/ui/toast";

export interface WebhookSetupError {
  code: "GITHUB_PERMISSION_DENIED" | "LOCALHOST_NOT_SUPPORTED" | "SETUP_FAILED";
  message: string;
}

const PERMISSION_DENIED_PATTERN = /forbidden|resource not accessible|\b403\b/i;
const LOCALHOST_PATTERN = /localhost|not reachable over the public internet/i;

export function toWebhookSetupError(error: unknown): WebhookSetupError {
  const detail = error instanceof Error ? error.message : "";
  if (PERMISSION_DENIED_PATTERN.test(detail)) {
    return {
      code: "GITHUB_PERMISSION_DENIED",
      message:
        "The Reflet GitHub App can’t create webhooks on this repository yet.",
    };
  }
  if (LOCALHOST_PATTERN.test(detail)) {
    return {
      code: "LOCALHOST_NOT_SUPPORTED",
      message: "GitHub can’t send webhooks to a local address.",
    };
  }
  return {
    code: "SETUP_FAILED",
    message:
      "GitHub didn’t accept the webhook. Try again, or reconnect GitHub if it keeps failing.",
  };
}

export async function runOrToast(
  task: () => Promise<unknown>,
  failureMessage: string
): Promise<void> {
  try {
    await task();
  } catch {
    toast.error(failureMessage);
  }
}
