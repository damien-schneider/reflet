"use client";

import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnalysisProperty } from "@/features/feedback/components/properties/analysis-property";
import { ClarificationProperty } from "@/features/feedback/components/properties/clarification-property";
import { DiscardAssessment } from "@/features/feedback/components/properties/discard-assessment";
import { TriageAnalysis } from "@/features/feedback/components/properties/triage-analysis";

export type AiAnalysisDisplayProps = Pick<
  Doc<"feedback">,
  | "aiJunk"
  | "aiPriority"
  | "aiPriorityReasoning"
  | "aiComplexity"
  | "aiComplexityReasoning"
  | "aiNeedsReview"
  | "aiTimeEstimate"
  | "priority"
  | "complexity"
  | "timeEstimate"
  | "needsClarification"
> & {
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
};

export function AiAnalysisDisplay(props: AiAnalysisDisplayProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnalysisProperty
        feedbackId={props.feedbackId}
        name="priority"
        values={{
          ai: props.aiPriority,
          editable: props.isAdmin,
          human: props.priority,
          reasoning: props.aiPriorityReasoning,
        }}
      />
      <AnalysisProperty
        feedbackId={props.feedbackId}
        name="complexity"
        values={{
          ai: props.aiComplexity,
          editable: props.isAdmin,
          human: props.complexity,
          reasoning: props.aiComplexityReasoning,
        }}
      />
      <AnalysisProperty
        feedbackId={props.feedbackId}
        name="timeEstimate"
        values={{
          ai: props.aiTimeEstimate,
          editable: props.isAdmin,
          human: props.timeEstimate,
        }}
      />
      <ClarificationProperty
        editable={props.isAdmin}
        feedback={props}
        feedbackId={props.feedbackId}
      />
      <DiscardAssessment probability={props.aiJunk} />
      <TriageAnalysis editable={props.isAdmin} feedbackId={props.feedbackId} />
    </div>
  );
}
