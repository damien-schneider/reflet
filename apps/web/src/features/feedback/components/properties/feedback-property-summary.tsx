import { Badge } from "@ctrl-ui/react/ui/badge";
import { Sparkle } from "@phosphor-icons/react";
import {
  clarificationValue,
  PUBLICATION_LABELS,
  type PublicationState,
  publicationState,
} from "@reflet/backend/convex/feedback/property_values";
import { WITHHOLD_JUNK_THRESHOLD } from "@reflet/backend/convex/feedback/triage_questions";
import { STATUS_DEFINITIONS } from "@reflet/backend/convex/organizations/status_definitions";
import { TagBadge } from "@/components/tag-badge";
import type { FeedbackItem } from "@/features/feedback/components/feed-feedback-view";
import { AiRejectionBadge } from "@/features/feedback/components/properties/presentation/ai-rejection-badge";
import type { TagColor } from "@/lib/tag-colors";

const PUBLICATION_COLORS = {
  approved: "green",
  internal: "gray",
  pending: "yellow",
  rejected: "red",
} satisfies Record<PublicationState, TagColor>;

export function FeedbackPropertySummary({
  feedback,
}: {
  feedback: FeedbackItem;
}) {
  const status =
    feedback.organizationStatus ??
    (feedback.status ? STATUS_DEFINITIONS[feedback.status] : undefined);
  return (
    <fieldset
      aria-label="Feedback properties"
      className="flex flex-wrap items-center gap-1.5"
    >
      {status && <TagBadge color={status.color}>{status.name}</TagBadge>}
      {feedback.isMember && <MemberPropertySummary feedback={feedback} />}
    </fieldset>
  );
}

function MemberPropertySummary({ feedback }: { feedback: FeedbackItem }) {
  const clarification = clarificationValue(feedback);
  const publicationStatus =
    feedback.isApproved === undefined
      ? undefined
      : publicationState({ ...feedback, isApproved: feedback.isApproved });
  return (
    <>
      <Badge variant="outline">
        {feedback.assignee?.name ??
          (feedback.assigneeId ? "Assigned teammate" : "Unassigned")}
      </Badge>
      {publicationStatus && (
        <TagBadge color={PUBLICATION_COLORS[publicationStatus]}>
          {PUBLICATION_LABELS[publicationStatus]}
        </TagBadge>
      )}
      {feedback.aiJunk !== undefined &&
        feedback.aiJunk >= WITHHOLD_JUNK_THRESHOLD && (
          <AiRejectionBadge probability={feedback.aiJunk} />
        )}
      {clarification.value && (
        <TagBadge color="orange">
          {clarification.origin === "ai" && (
            <Sparkle aria-hidden className="size-3" />
          )}
          Needs clarification
        </TagBadge>
      )}
    </>
  );
}
