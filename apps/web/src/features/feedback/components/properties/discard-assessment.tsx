"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Sparkle } from "@phosphor-icons/react";
import {
  buildQuestions,
  JUNK_QUESTION_ID,
  WITHHOLD_JUNK_THRESHOLD,
} from "@reflet/backend/convex/feedback/triage_questions";

export function DiscardAssessment({ probability }: { probability?: number }) {
  if (probability === undefined || probability < WITHHOLD_JUNK_THRESHOLD) {
    return null;
  }
  const question = buildQuestions([])[JUNK_QUESTION_ID];
  return (
    <Popover>
      <PopoverTrigger render={<Button size="xs" variant="surface" />}>
        <Sparkle aria-hidden className="size-3" />
        JEV suggests rejection · {Math.round(probability * 100)}%
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <p className="font-medium text-sm">Discard recommendation</p>
        <p className="text-muted-foreground text-xs">
          JEV estimates a {Math.round(probability * 100)}% probability that this
          submission should be withheld. This is an AI assessment. It does not
          archive or delete feedback.
        </p>
        <p className="text-xs">Criterion: {question.criteria.true}</p>
        <p className="text-xs">
          No individual explanation was returned by the model. Inspect the saved
          JEV analysis for the actual input and score.
        </p>
        <p className="text-xs">
          Approve publication to accept it, or reject publication to archive it
          in Trash. Without a human decision, suspect feedback stays pending.
        </p>
      </PopoverContent>
    </Popover>
  );
}
