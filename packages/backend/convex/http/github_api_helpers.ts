import type { Id } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import { createAuth } from "../auth/auth";
import { jsonResponse } from "./helpers";

// ============================================
// TYPES
// ============================================

export type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

// ============================================
// AUTH HELPER
// ============================================

export async function requireSession(
  ctx: ActionCtx,
  request: Request
): Promise<
  | { success: true; session: { user: { id: string } } }
  | { success: false; response: Response }
> {
  const auth = createAuth(ctx);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return {
      success: false,
      response: jsonResponse({ error: "Authentication required" }, 401),
    };
  }
  return { success: true, session };
}

// ============================================
// HELPERS
// ============================================

export function toOrgId(value: string): Id<"organizations"> {
  return value as Id<"organizations">;
}

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseGitHubError(errorMessage: string): {
  error: string;
  code: string;
  message: string;
  status: number;
} {
  if (
    errorMessage.includes("403") ||
    errorMessage.toLowerCase().includes("forbidden")
  ) {
    return {
      error: "Permission denied",
      code: "GITHUB_PERMISSION_DENIED",
      message:
        "The GitHub App is missing the required webhook permissions. Please update the app permissions in GitHub settings.",
      status: 403,
    };
  }

  if (
    errorMessage.includes("404") ||
    errorMessage.toLowerCase().includes("not found")
  ) {
    return {
      error: "Repository not found",
      code: "GITHUB_REPO_NOT_FOUND",
      message:
        "The repository could not be found. Please ensure the GitHub App has access to this repository.",
      status: 404,
    };
  }

  if (
    errorMessage.includes("localhost") ||
    errorMessage.includes("not reachable over the public Internet")
  ) {
    return {
      error: "Localhost not supported",
      code: "LOCALHOST_NOT_SUPPORTED",
      message:
        "GitHub webhooks require a publicly accessible URL. Use a tunneling service (ngrok, cloudflared) for local development, or test in a deployed environment.",
      status: 400,
    };
  }

  if (
    errorMessage.includes("422") ||
    errorMessage.includes("url is missing a scheme") ||
    errorMessage.includes("Validation Failed")
  ) {
    return {
      error: "Server configuration error",
      code: "INVALID_WEBHOOK_URL",
      message:
        "The webhook URL could not be configured. Please contact support.",
      status: 500,
    };
  }

  return {
    error: "Failed to setup GitHub integration",
    code: "GITHUB_SETUP_FAILED",
    message: errorMessage,
    status: 500,
  };
}
