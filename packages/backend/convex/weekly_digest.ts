"use node";

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send weekly digest emails to all organization members who have opted in.
 * Scheduled by cron every Monday at 9:00 UTC.
 */
export const sendAllDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgIds = await ctx.runQuery(
      internal.weekly_digest_helpers.getAllOrganizationIds
    );

    for (const orgId of orgIds) {
      try {
        await sendDigestForOrg(ctx, orgId);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[Weekly Digest] Failed for org ${orgId}: ${errorMsg}`);
      }
    }
  },
});

async function sendDigestForOrg(ctx: ActionCtx, orgId: string): Promise<void> {
  const digest = await ctx.runQuery(
    internal.weekly_digest_helpers.getDigestData,
    { organizationId: orgId }
  );

  if (!digest) {
    return;
  }

  const hasActivity =
    digest.newFeedbackCount > 0 ||
    digest.totalVotes > 0 ||
    digest.statusChanges.length > 0;

  if (!hasActivity) {
    return;
  }

  const members = await ctx.runQuery(
    internal.weekly_digest_helpers.getDigestRecipients,
    { organizationId: orgId }
  );

  if (members.length === 0) {
    return;
  }

  const siteUrl = process.env.SITE_URL ?? "";

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);

    for (const member of batch) {
      try {
        const isSuppressed = await ctx.runQuery(
          internal.email_suppression.isEmailSuppressed,
          { email: member.email }
        );

        if (isSuppressed) {
          continue;
        }

        await ctx.runAction(internal.email_renderer.sendWeeklyDigestEmail, {
          to: member.email,
          organizationName: digest.orgName,
          newFeedbackCount: digest.newFeedbackCount,
          totalVotes: digest.totalVotes,
          topFeedback: digest.topFeedback.map(
            (f: {
              title: string;
              voteCount: number;
              status: string;
              feedbackId: string;
              url: string;
            }) => ({
              ...f,
              url: `${siteUrl}/${digest.orgSlug}/feedback/${f.feedbackId}`,
            })
          ),
          statusChanges: digest.statusChanges,
          dashboardUrl: `${siteUrl}/dashboard/${digest.orgSlug}`,
          unsubscribeUrl: `${siteUrl}/settings/notifications`,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Weekly Digest] Failed to send to ${member.email}: ${errorMsg}`
        );
      }
    }

    if (i + BATCH_SIZE < members.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}
