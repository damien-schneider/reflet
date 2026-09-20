"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";

import { NeedsReviewBadge } from "../needs-review-badge";
import type { Complexity, Priority } from "./ai-analysis-types";
import { ComplexityBadge } from "./complexity-badge";
import { PriorityBadge } from "./priority-badge";
import { TimeEstimateBadge } from "./time-estimate-badge";

export interface AiAnalysisDisplayProps {
  aiComplexity?: Complexity | null;
  aiComplexityReasoning?: string | null;
  aiNeedsReview?: number | null;
  aiPriority?: Priority | null;
  aiPriorityReasoning?: string | null;
  aiTimeEstimate?: string | null;
  complexity?: Complexity | null;
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
  priority?: Priority | null;
  timeEstimate?: string | null;
}

export function AiAnalysisDisplay({
  feedbackId,
  aiPriority,
  aiPriorityReasoning,
  aiComplexity,
  aiComplexityReasoning,
  aiNeedsReview,
  aiTimeEstimate,
  priority,
  complexity,
  timeEstimate,
  isAdmin,
}: AiAnalysisDisplayProps) {
  const recomputeAnalysis = useMutation(
    api.feedback.auto_tagging_jobs.recomputeFeedbackAnalysis
  );

  if (!isAdmin) {
    return null;
  }

  const effectivePriority = priority ?? aiPriority;
  const effectiveComplexity = complexity ?? aiComplexity;
  const effectiveTimeEstimate = timeEstimate ?? aiTimeEstimate;

  const isPriorityOverridden = priority !== null && priority !== aiPriority;
  const isComplexityOverridden =
    complexity !== null && complexity !== aiComplexity;
  const isTimeOverridden =
    timeEstimate !== null && timeEstimate !== aiTimeEstimate;

  const handleRecompute = async () => {
    try {
      await recomputeAnalysis({ feedbackId });
      toast.success("Recomputing analysis");
    } catch (error) {
      toast.error("Failed to recompute analysis", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {effectivePriority && (
        <PriorityBadge
          aiPriority={aiPriority}
          effectivePriority={effectivePriority}
          feedbackId={feedbackId}
          hasHumanOverride={priority !== null}
          isAdmin={isAdmin}
          isOverridden={isPriorityOverridden}
          reasoning={aiPriorityReasoning}
        />
      )}
      {effectiveComplexity && (
        <ComplexityBadge
          aiComplexity={aiComplexity}
          effectiveComplexity={effectiveComplexity}
          feedbackId={feedbackId}
          hasHumanOverride={complexity !== null}
          isAdmin={isAdmin}
          isOverridden={isComplexityOverridden}
          reasoning={aiComplexityReasoning}
        />
      )}
      {effectiveTimeEstimate && (
        <TimeEstimateBadge
          aiTimeEstimate={aiTimeEstimate}
          effectiveEstimate={effectiveTimeEstimate}
          feedbackId={feedbackId}
          hasHumanOverride={timeEstimate !== null}
          isAdmin={isAdmin}
          isOverridden={isTimeOverridden}
        />
      )}
      <NeedsReviewBadge probability={aiNeedsReview} />
      <Button
        aria-label="Recompute AI analysis"
        iconOnly
        onClick={handleRecompute}
        size="xs"
        variant="ghost"
      >
        <ArrowsClockwise className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
