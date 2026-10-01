import { Badge } from "@ctrl-ui/react/ui/badge";
import { Sparkle } from "@phosphor-icons/react";
import {
  clarificationValue,
  PUBLICATION_LABELS,
  publicationState,
} from "@reflet/backend/convex/feedback/property_values";
import { WITHHOLD_JUNK_THRESHOLD } from "@reflet/backend/convex/feedback/triage_questions";
import { STATUS_DEFINITIONS } from "@reflet/backend/convex/organizations/status_definitions";
import { TagBadge } from "@/components/tag-badge";
import type { FeedbackItem } from "@/features/feedback/components/feed-feedback-view";

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
      {status && (
        <TagBadge color={status.color} size="sm">
          {status.name}
        </TagBadge>
      )}
      {feedback.isMember && <MemberPropertySummary feedback={feedback} />}
    </fieldset>
  );
}

function MemberPropertySummary({ feedback }: { feedback: FeedbackItem }) {
  const clarification = clarificationValue(feedback);
  return (
    <>
      <Badge size="sm" variant="outline">
        {feedback.assignee?.name ??
          (feedback.assigneeId ? "Assigned teammate" : "Unassigned")}
      </Badge>
      {feedback.isApproved !== undefined && (
        <Badge size="sm" variant="outline">
          {
            PUBLICATION_LABELS[
              publicationState({
                ...feedback,
                isApproved: feedback.isApproved,
              })
            ]
          }
        </Badge>
      )}
      {feedback.aiJunk !== undefined &&
        feedback.aiJunk >= WITHHOLD_JUNK_THRESHOLD && (
          <Badge size="sm" variant="outline">
            <Sparkle aria-hidden className="size-3" />
            JEV suggests rejection · {Math.round(feedback.aiJunk * 100)}%
          </Badge>
        )}
      {clarification.value && (
        <Badge size="sm" variant="outline">
          {clarification.origin === "ai" && (
            <Sparkle aria-hidden className="size-3" />
          )}
          Needs clarification
        </Badge>
      )}
    </>
  );
}
