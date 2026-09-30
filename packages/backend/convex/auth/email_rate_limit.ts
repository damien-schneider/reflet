import type { GenericCtx } from "@convex-dev/better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { DataModel } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { rateLimiter } from "../shared/rate_limits";

const EMAIL_LIMIT_BY_PATH = {
  "/forget-password": "authPasswordResetPerEmail",
  "/request-password-reset": "authPasswordResetPerEmail",
  "/send-verification-email": "authVerificationEmailPerEmail",
  "/sign-in/email": "authSignInPerEmail",
  "/sign-up/email": "authSignUpPerEmail",
} as const;

const isLimitedPath = (
  path: string
): path is keyof typeof EMAIL_LIMIT_BY_PATH => path in EMAIL_LIMIT_BY_PATH;

const readEmail = (body: unknown): string | null => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string"
  ) {
    return null;
  }
  const email = body.email.trim().toLowerCase();
  return email || null;
};

export async function consumeAuthEmailLimit(
  ctx: MutationCtx | ActionCtx,
  request: { body: unknown; path: string }
): Promise<{ ok: boolean; retryAfter?: number }> {
  const email = readEmail(request.body);
  if (!(email && isLimitedPath(request.path))) {
    return { ok: true };
  }
  return await rateLimiter.limit(ctx, EMAIL_LIMIT_BY_PATH[request.path], {
    key: email,
  });
}

export const createAuthEmailRateLimitHook = (ctx: GenericCtx<DataModel>) =>
  createAuthMiddleware(async (hookCtx) => {
    if (!("runMutation" in ctx)) {
      return;
    }
    const { ok, retryAfter } = await consumeAuthEmailLimit(ctx, {
      body: hookCtx.body,
      path: hookCtx.path,
    });
    if (ok) {
      return;
    }
    throw new APIError(
      "TOO_MANY_REQUESTS",
      { message: "Too many requests. Please try again later." },
      { "Retry-After": String(Math.ceil((retryAfter ?? 0) / 1000)) }
    );
  });
