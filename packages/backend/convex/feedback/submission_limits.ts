import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";

const MAX_ATTACHMENTS_PER_FEEDBACK = 10;

export const validateFeedbackSubmission = (input: {
  attachments?: string[];
  description?: string;
  title?: string;
}): void => {
  validateInputLength(input.title, MAX_TITLE_LENGTH, "Title");
  validateInputLength(input.description, MAX_DESCRIPTION_LENGTH, "Description");
  const attachments = input.attachments ?? [];
  if (attachments.length > MAX_ATTACHMENTS_PER_FEEDBACK) {
    throw new Error(
      `At most ${MAX_ATTACHMENTS_PER_FEEDBACK} attachments allowed`
    );
  }
  for (const url of attachments) {
    validateInputLength(url, MAX_URL_LENGTH, "Attachment URL");
  }
};

export const enforceFeedbackLimit = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<void> => {
  const existingFeedback = await ctx.db
    .query("feedback")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  const activeCount = existingFeedback.filter((f) => !f.deletedAt).length;

  const limit = PLAN_LIMITS[await getOrgTier(ctx, organizationId)].maxFeedback;
  if (activeCount >= limit) {
    throw new Error(
      `Feedback limit reached. This organization allows ${limit} feedback items.`
    );
  }
};
