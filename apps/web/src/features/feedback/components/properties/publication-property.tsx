"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  FEEDBACK_PROPERTIES,
  PUBLICATION_LABELS,
  type PublicationState,
  publicationState,
} from "@reflet/backend/convex/feedback/property_values";
import { useMutation } from "convex/react";
import { formatPropertyTime } from "@/features/feedback/components/properties/time/format-property-time";

const PUBLICATION_STATES: PublicationState[] = [
  "internal",
  "pending",
  "approved",
  "rejected",
];

export function PublicationProperty({
  feedbackId,
  publication,
  editable,
}: {
  feedbackId: Id<"feedback">;
  publication: {
    isApproved: boolean;
    isInternal?: boolean;
    publicationRejectedAt?: number;
    organizationIsPublic: boolean;
    publicationReviewedAt?: number;
  };
  editable: boolean;
}) {
  const state = publicationState(publication);
  const setState = useMutation(api.feedback.publication.setState);
  async function decide(next: PublicationState) {
    try {
      await setState({ feedbackId, state: next });
    } catch (error) {
      toast.error("Could not update publication", {
        description: error instanceof Error ? error.message : "Try again",
      });
    }
  }
  return (
    <Popover>
      <PopoverTrigger render={<Button size="xs" variant="surface" />}>
        {PUBLICATION_LABELS[state]}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <p className="font-medium text-sm">
          {FEEDBACK_PROPERTIES.publication.label}
        </p>
        <p className="text-muted-foreground text-xs">
          {FEEDBACK_PROPERTIES.publication.meaning}
        </p>
        <p className="text-sm">
          {state === "approved" && publication.organizationIsPublic
            ? "Visible on the public board"
            : "Visible to the team"}
        </p>
        {!publication.organizationIsPublic && (
          <p className="text-muted-foreground text-xs">
            The project is private. Approval only becomes public when the
            project is public.
          </p>
        )}
        {publication.publicationReviewedAt && (
          <p className="text-muted-foreground text-xs">
            Human decision ·{" "}
            {formatPropertyTime(publication.publicationReviewedAt)}
          </p>
        )}
        {editable && (
          <p className="text-muted-foreground text-xs">
            Rejecting publication archives the feedback in Trash. An admin can
            restore it.
          </p>
        )}
        {editable && (
          <div className="flex flex-col items-start gap-1">
            {PUBLICATION_STATES.map((next) => (
              <Button
                key={next}
                onClick={() => decide(next)}
                size="xs"
                variant={state === next ? "surface" : "ghost"}
              >
                {PUBLICATION_LABELS[next]}
              </Button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
