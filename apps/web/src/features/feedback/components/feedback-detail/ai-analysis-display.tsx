"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import type { Complexity, Priority } from "./ai-analysis-types";
import { ComplexityBadge } from "./complexity-badge";
import { PriorityBadge } from "./priority-badge";
import { TimeEstimateBadge } from "./time-estimate-badge";

export interface AiAnalysisDisplayProps {
  feedbackId: Id<"feedback">;
  aiPriority?: Priority | null;
  aiPriorityReasoning?: string | null;
  aiComplexity?: Complexity | null;
  aiComplexityReasoning?: string | null;
  aiTimeEstimate?: string | null;
  priority?: Priority | null;
  complexity?: Complexity | null;
  timeEstimate?: string | null;
  isAdmin: boolean;
}

export function AiAnalysisDisplay({
  feedbackId,
  aiPriority,
  aiPriorityReasoning,
  aiComplexity,
  aiComplexityReasoning,
  aiTimeEstimate,
  priority,
  complexity,
  timeEstimate,
  isAdmin,
}: AiAnalysisDisplayProps) {
  if (!isAdmin) {
    return null;
  }

  const effectivePriority = priority ?? aiPriority;
  const effectiveComplexity = complexity ?? aiComplexity;
  const effectiveTimeEstimate = timeEstimate ?? aiTimeEstimate;

  const hasAnyAnalysis =
    effectivePriority || effectiveComplexity || effectiveTimeEstimate;

  if (!hasAnyAnalysis) {
    return null;
  }

  const isPriorityOverridden = priority != null && priority !== aiPriority;
  const isComplexityOverridden =
    complexity != null && complexity !== aiComplexity;
  const isTimeOverridden =
    timeEstimate != null && timeEstimate !== aiTimeEstimate;

  return (
    <div className="flex items-center gap-1.5">
      {effectivePriority && (
        <PriorityBadge
          aiPriority={aiPriority}
          effectivePriority={effectivePriority}
          feedbackId={feedbackId}
          hasHumanOverride={priority != null}
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
          hasHumanOverride={complexity != null}
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
          hasHumanOverride={timeEstimate != null}
          isAdmin={isAdmin}
          isOverridden={isTimeOverridden}
        />
      )}
    </div>
  );
}
