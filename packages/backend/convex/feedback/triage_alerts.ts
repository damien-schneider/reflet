import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { rateLimiter } from "../shared/rate_limits";

export const alertPlatformOnTriageFailure = async (
  ctx: MutationCtx,
  run: Doc<"feedbackTriageRuns">,
  error: string
): Promise<void> => {
  const organization = await ctx.db.get(run.organizationId);
  if (!organization) {
    return;
  }
  const alertBudget = await rateLimiter.limit(
    ctx,
    "platformTriageFailureAlert"
  );
  if (!alertBudget.ok) {
    return;
  }
  await ctx.scheduler.runAfter(
    0,
    internal.email.renderer.sendPlatformAlertEmail,
    {
      details: [
        `Organization: ${organization.name} (${organization.slug})`,
        `Feedback: ${run.input.title}`,
        `Error: ${error}`,
        "Further triage failures are muted for one hour.",
      ],
      subject: `Triage failing: ${error}`,
      title: "A JEV triage run failed",
    }
  );
};
