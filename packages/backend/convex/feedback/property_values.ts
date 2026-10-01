import type { Doc } from "../_generated/dataModel";

export const FEEDBACK_PROPERTIES = {
  assignee: {
    compact: true,
    label: "Responsible",
    meaning:
      "The teammate responsible for this feedback. An agent claim is temporary execution, not ownership.",
    owner: "team",
    permission: "admin",
  },
  clarification: {
    compact: true,
    label: "Needs clarification",
    meaning:
      "A teammate needs to follow up with the author before work can proceed. Separate from publication approval.",
    owner: "assessment",
    permission: "admin",
  },
  complexity: {
    compact: false,
    label: "Complexity",
    meaning:
      "The effective implementation complexity. JEV triage does not estimate this.",
    owner: "assessment",
    permission: "admin",
  },
  priority: {
    compact: false,
    label: "Priority",
    meaning:
      "The effective priority; an explicit human decision takes precedence over an AI proposal.",
    owner: "assessment",
    permission: "admin",
  },
  publication: {
    compact: true,
    label: "Publication",
    meaning:
      "Audience and publication approval. Approval alone does not make internal feedback public.",
    owner: "team",
    permission: "admin",
  },
  status: {
    compact: true,
    label: "Status",
    meaning:
      "The lifecycle of the work; a column has a stable meaning even after renaming.",
    owner: "team",
    permission: "member",
  },
  timeEstimate: {
    compact: false,
    label: "Time estimate",
    meaning:
      "The effective implementation estimate. JEV triage does not estimate this.",
    owner: "assessment",
    permission: "admin",
  },
} as const;

export const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "None",
} as const;
export const COMPLEXITY_LABELS = {
  complex: "Complex",
  moderate: "Moderate",
  simple: "Simple",
  trivial: "Trivial",
  very_complex: "Very complex",
} as const;
export const PUBLICATION_LABELS = {
  approved: "Approved for publication",
  internal: "Internal",
  pending: "Pending publication review",
  rejected: "Publication rejected",
} as const;
export type PublicationState = keyof typeof PUBLICATION_LABELS;
export const NEEDS_CLARIFICATION_THRESHOLD = 0.75;

export function resolvePropertyValue<T>(
  human: T | null | undefined,
  ai: T | null | undefined
) {
  if (human !== undefined) {
    return { origin: "human" as const, value: human };
  }
  if (ai !== null && ai !== undefined) {
    return { origin: "ai" as const, value: ai };
  }
  return { origin: "unset" as const, value: undefined };
}

export function clarificationValue(
  feedback: Pick<Doc<"feedback">, "needsClarification" | "aiNeedsReview">
) {
  const assessment =
    feedback.aiNeedsReview === undefined
      ? undefined
      : feedback.aiNeedsReview >= NEEDS_CLARIFICATION_THRESHOLD;
  return resolvePropertyValue(feedback.needsClarification, assessment);
}

export function publicationState(feedback: {
  isInternal?: boolean;
  isApproved: boolean;
  publicationRejectedAt?: number;
}): PublicationState {
  if (feedback.isInternal) {
    return "internal";
  }
  if (feedback.publicationRejectedAt !== undefined) {
    return "rejected";
  }
  return feedback.isApproved ? "approved" : "pending";
}

export const isFeedbackPublishable = (
  feedback: Pick<
    Doc<"feedback">,
    "isInternal" | "isApproved" | "publicationRejectedAt" | "deletedAt"
  >
) =>
  publicationState(feedback) === "approved" && feedback.deletedAt === undefined;
