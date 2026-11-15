import type { MutationCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { isGloballySuppressed } from "../email/suppression";
import { rateLimiter } from "../shared/rate_limits";
import { DEFAULT_PREFERENCES } from "./preferences";

type EmailPreference =
  | "emailOnFeedbackShipped"
  | "emailOnInboxMessage"
  | "emailOnNewFeedback"
  | "emailOnWeeklyDigest";

export const optedInEmailAddress = async (
  ctx: MutationCtx,
  recipient: { preference: EmailPreference; userId: string }
): Promise<string | null> => {
  const preferences = await ctx.db
    .query("userNotificationPreferences")
    .withIndex("by_user", (q) => q.eq("userId", recipient.userId))
    .first();
  const wantsEmail =
    preferences?.[recipient.preference] ??
    DEFAULT_PREFERENCES[recipient.preference];
  if (!wantsEmail) {
    return null;
  }
  const member = await authComponent.getAnyUserById(ctx, recipient.userId);
  if (!member?.email || (await isGloballySuppressed(ctx, member.email))) {
    return null;
  }
  return member.email;
};

export const teamAlertEmailAddress = async (
  ctx: MutationCtx,
  alert: {
    preference: EmailPreference;
    rateLimit: "newFeedbackAlertPerMember" | "supportInboxAlertPerMember";
    userId: string;
  }
): Promise<string | null> => {
  const email = await optedInEmailAddress(ctx, alert);
  if (!email) {
    return null;
  }
  const { ok } = await rateLimiter.limit(ctx, alert.rateLimit, {
    key: alert.userId,
  });
  return ok ? email : null;
};
