"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  clarificationValue,
  FEEDBACK_PROPERTIES,
} from "@reflet/backend/convex/feedback/property_values";
import { useMutation } from "convex/react";

type ClarificationFeedback = Pick<
  Doc<"feedback">,
  "needsClarification" | "aiNeedsReview"
>;

function clarificationLabel(value: boolean | null | undefined) {
  if (value === undefined) {
    return "Not assessed";
  }
  return value ? "Needs clarification" : "Ready to act";
}

function useClarificationDecision(feedbackId: Id<"feedback">) {
  const update = useMutation(api.feedback.triage_actions.updateAnalysis);
  return async function decide(value: boolean | undefined) {
    try {
      await update({
        feedbackId,
        needsClarification: value,
        resetClarification: value === undefined,
      });
    } catch (error) {
      toast.error("Could not update clarification", {
        description: error instanceof Error ? error.message : "Try again",
      });
    }
  };
}

function ClarificationDescription({
  feedback,
}: {
  feedback: ClarificationFeedback;
}) {
  const effective = clarificationValue(feedback);
  const origin = {
    ai: "JEV assessment",
    human: "Human decision",
    unset: "No assessment",
  }[effective.origin];
  return (
    <>
      <p className="font-medium text-sm">
        {FEEDBACK_PROPERTIES.clarification.label}
      </p>
      <p className="text-muted-foreground text-xs">
        {FEEDBACK_PROPERTIES.clarification.meaning}
      </p>
      <p className="text-sm">
        {origin}: {clarificationLabel(effective.value)}
      </p>
      {feedback.aiNeedsReview !== undefined && (
        <p className="text-muted-foreground text-xs">
          JEV follow-up probability: {Math.round(feedback.aiNeedsReview * 100)}%
        </p>
      )}
    </>
  );
}

function ClarificationActions({
  feedbackId,
  feedback,
}: {
  feedbackId: Id<"feedback">;
  feedback: ClarificationFeedback;
}) {
  const decide = useClarificationDecision(feedbackId);
  const effective = clarificationValue(feedback);
  return (
    <div className="flex flex-wrap gap-1">
      <Button onClick={() => decide(true)} size="xs" variant="ghost">
        Needs clarification
      </Button>
      <Button onClick={() => decide(false)} size="xs" variant="ghost">
        Ready to act
      </Button>
      {effective.origin === "human" && (
        <Button onClick={() => decide(undefined)} size="xs" variant="ghost">
          Use JEV assessment
        </Button>
      )}
    </div>
  );
}

export function ClarificationProperty({
  feedbackId,
  feedback,
  editable,
}: {
  feedbackId: Id<"feedback">;
  feedback: ClarificationFeedback;
  editable: boolean;
}) {
  const effective = clarificationValue(feedback);
  return (
    <Popover>
      <PopoverTrigger render={<Button size="xs" variant="surface" />}>
        {effective.origin === "ai" && <Sparkle aria-hidden />}
        {clarificationLabel(effective.value)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <ClarificationDescription feedback={feedback} />
        {editable && (
          <ClarificationActions feedback={feedback} feedbackId={feedbackId} />
        )}
      </PopoverContent>
    </Popover>
  );
}
