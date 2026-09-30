import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { MAX_EMAIL_LENGTH } from "../shared/constants";
import { rateLimiter } from "../shared/rate_limits";
import { isValidEmail } from "../shared/validators";

export type SubscriptionList = "changelog" | "status";

export const normalizeSubscriberEmail = (rawEmail: string): string => {
  const email = rawEmail.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
    throw new Error("Invalid email format");
  }
  return email;
};

export const isCallerVerifiedEmail = async (
  ctx: MutationCtx,
  email: string
): Promise<boolean> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user?.emailVerified === true && user.email.toLowerCase() === email;
};

export const sendSubscriptionConfirmation = async (
  ctx: MutationCtx,
  request: {
    email: string;
    list: SubscriptionList;
    organizationName: string;
    token: string;
  }
): Promise<void> => {
  await rateLimiter.limit(ctx, "subscriptionConfirmationPerEmail", {
    key: request.email,
    throws: true,
  });
  const siteUrl = process.env.SITE_URL ?? "";
  const confirmUrl = `${siteUrl}/subscriptions/confirm?list=${request.list}&token=${request.token}`;
  await ctx.scheduler.runAfter(
    0,
    internal.email.renderer.sendSubscriptionConfirmationEmail,
    {
      confirmUrl,
      list: request.list,
      organizationName: request.organizationName,
      to: request.email,
    }
  );
};
