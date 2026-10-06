"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnalysisProperty } from "@/features/feedback/components/properties/analysis-property";
import { ClarificationProperty } from "@/features/feedback/components/properties/clarification-property";
import { DiscardAssessment } from "@/features/feedback/components/properties/discard-assessment";
import {
  type FeedbackPropertiesLayout,
  PropertyRow,
} from "@/features/feedback/components/properties/presentation/property-row";
import { TriageAnalysis } from "@/features/feedback/components/properties/triage-analysis";

export type AiAnalysisDisplayProps = Pick<
  Doc<"feedback">,
  | "aiJunk"
  | "aiPriority"
  | "aiPriorityReasoning"
  | "aiNeedsReview"
  | "priority"
  | "complexity"
  | "timeEstimate"
  | "needsClarification"
> & {
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
  layout?: FeedbackPropertiesLayout;
};

export function AiAnalysisDisplay(props: AiAnalysisDisplayProps) {
  return (
    <div
      className={cn(
        props.layout === "panel"
          ? "border-t pt-4"
          : "flex flex-wrap items-center gap-1.5"
      )}
    >
      {props.layout === "panel" && (
        <h3 className="mb-2 font-medium text-body">Assessment</h3>
      )}
      <PropertyRow label="Priority" layout={props.layout}>
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
      </PropertyRow>
      <PropertyRow label="Complexity" layout={props.layout}>
        <AnalysisProperty
          feedbackId={props.feedbackId}
          name="complexity"
          values={{
            editable: props.isAdmin,
            human: props.complexity,
          }}
        />
      </PropertyRow>
      <PropertyRow label="Estimate" layout={props.layout}>
        <AnalysisProperty
          feedbackId={props.feedbackId}
          name="timeEstimate"
          values={{
            editable: props.isAdmin,
            human: props.timeEstimate,
          }}
        />
      </PropertyRow>
      <PropertyRow label="Clarification" layout={props.layout}>
        <ClarificationProperty
          editable={props.isAdmin}
          feedback={props}
          feedbackId={props.feedbackId}
        />
      </PropertyRow>
      <DiscardAssessment layout={props.layout} probability={props.aiJunk} />
      <PropertyRow label="Analysis" layout={props.layout}>
        <TriageAnalysis
          editable={props.isAdmin}
          feedbackId={props.feedbackId}
        />
      </PropertyRow>
    </div>
  );
}
