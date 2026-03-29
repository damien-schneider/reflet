import { v } from "convex/values";

// ============================================
// SCHEMA VALIDATORS (shared across domains)
// ============================================

export const subscriptionTier = v.union(v.literal("free"), v.literal("pro"));
export const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("none")
);

export const memberRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member")
);

export const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired")
);

export const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

export const notificationType = v.union(
  v.literal("status_change"),
  v.literal("new_comment"),
  v.literal("vote_milestone"),
  v.literal("new_support_message"),
  v.literal("invitation"),
  v.literal("feedback_shipped"),
  v.literal("intelligence_insight"),
  v.literal("incident_detected"),
  v.literal("incident_resolved")
);

export const supportConversationStatus = v.union(
  v.literal("open"),
  v.literal("awaiting_reply"),
  v.literal("resolved"),
  v.literal("closed")
);

export const supportMessageSenderType = v.union(
  v.literal("user"),
  v.literal("admin")
);

export const widgetPosition = v.union(
  v.literal("bottom-right"),
  v.literal("bottom-left")
);

export const githubConnectionStatus = v.union(
  v.literal("connected"),
  v.literal("pending"),
  v.literal("error")
);

export const githubSyncStatus = v.union(
  v.literal("idle"),
  v.literal("syncing"),
  v.literal("success"),
  v.literal("error")
);

export const repoAnalysisStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("error")
);

export const websiteReferenceStatus = v.union(
  v.literal("pending"),
  v.literal("fetching"),
  v.literal("success"),
  v.literal("error")
);

export const domainStatus = v.union(
  v.literal("pending_verification"),
  v.literal("active"),
  v.literal("invalid_configuration"),
  v.literal("removing"),
  v.literal("error")
);

// ============================================
// INPUT VALIDATORS
// ============================================

/**
 * Validate input length to prevent DoS
 */
export const validateInputLength = (
  input: string | undefined | null,
  maxLength: number,
  fieldName: string
) => {
  if (input && input.length > maxLength) {
    throw new Error(
      `${fieldName} must be ${maxLength} characters or less. Currently ${input.length} characters.`
    );
  }
};
