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
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { formatPropertyTime } from "@/features/feedback/components/properties/time/format-property-time";

type TriageRun = FunctionReturnType<
  typeof api.feedback.triage_runs.list
>[number];

function RunInput({ run }: { run: TriageRun }) {
  return (
    <details>
      <summary className="cursor-pointer text-sm">Actual input sent</summary>
      <div className="mt-2 space-y-1 rounded-md bg-muted p-3 text-xs">
        <p className="font-medium">{run.input.title}</p>
        <p className="whitespace-pre-wrap">{run.input.description}</p>
        <p className="text-muted-foreground">
          Only title and description were sent as state. Category names and
          descriptions appear in the questions below.
        </p>
      </div>
    </details>
  );
}

function RunQuestions({ run }: { run: TriageRun }) {
  return (
    <details>
      <summary className="cursor-pointer text-sm">
        Questions, criteria and probabilities
      </summary>
      <div className="mt-2 space-y-3">
        {run.questions.map((question) => {
          const answer = run.answers?.find(
            (candidate) => candidate.questionId === question.id
          );
          return (
            <div
              className="space-y-1 rounded-md bg-muted p-3 text-xs"
              key={question.id}
            >
              <p className="font-medium">{question.instructions}</p>
              <p>Yes: {question.criteria.true}</p>
              <p>No: {question.criteria.false}</p>
              <p className="font-medium">
                {answer
                  ? `${Math.round(answer.probability * 100)}%`
                  : "No result"}
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function RunTagSuggestions({ run }: { run: TriageRun }) {
  if (!run.suggestions) {
    return null;
  }
  return (
    <ul className="space-y-1 text-xs">
      {run.suggestions.map((suggestion) => (
        <li key={suggestion.tagId}>
          {suggestion.name}: {Math.round(suggestion.probability * 100)}% ·{" "}
          {suggestion.outcome.replaceAll("_", " ")} at run time · Now:{" "}
          {
            run.currentSuggestions.find(
              (current) => current.tagId === suggestion.tagId
            )?.currentOutcome
          }
        </li>
      ))}
    </ul>
  );
}

function RunAnalysis({ run }: { run: TriageRun }) {
  const generatedAt = formatPropertyTime(run.completedAt ?? run.startedAt);
  return (
    <section className="space-y-3 border-b pb-3">
      <div>
        <p className="font-medium text-sm">
          {run.model} · {run.status}
        </p>
        <p className="text-muted-foreground text-xs">
          {generatedAt} · {run.criteriaVersion} · {run.inputVersion}
        </p>
      </div>
      {run.error && <p className="text-destructive text-sm">{run.error}</p>}
      <RunInput run={run} />
      <RunQuestions run={run} />
      <p className="text-muted-foreground text-xs">
        Hold for publication review at {run.thresholds.junk * 100}% junk. Needs
        clarification at {run.thresholds.clarification * 100}%. Apply categories
        at {run.thresholds.tag * 100}%, up to {run.thresholds.maxTags}.
      </p>
      {run.publicationDecision && (
        <p className="text-xs">{run.publicationDecision}</p>
      )}
      <RunTagSuggestions run={run} />
    </section>
  );
}

function AnalysisHistory({ feedbackId }: { feedbackId: Id<"feedback"> }) {
  const runs = useQuery(api.feedback.triage_runs.list, { feedbackId });
  if (runs === undefined) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Loading JEV analysis…
      </p>
    );
  }
  if (runs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No recorded JEV run. Historical scores have no saved input or criteria;
        recompute to record a complete analysis.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <RunAnalysis key={run._id} run={run} />
      ))}
    </div>
  );
}

export function TriageAnalysis({
  feedbackId,
  editable,
}: {
  feedbackId: Id<"feedback">;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { starting, runTriage } = useTriageRecompute(feedbackId);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button size="xs" variant="ghost" />}>
        JEV analysis
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">JEV analysis</p>
          {editable && (
            <Button
              disabled={starting}
              onClick={runTriage}
              size="xs"
              variant="surface"
            >
              Recompute triage
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          JEV assesses product usefulness, junk, clarification and categories.
          It does not choose a responsible teammate, change the internal
          audience, complete work or estimate implementation effort. Human
          corrections survive recompute.
        </p>
        {open && <AnalysisHistory feedbackId={feedbackId} />}
      </PopoverContent>
    </Popover>
  );
}

function useTriageRecompute(feedbackId: Id<"feedback">) {
  const [starting, setStarting] = useState(false);
  const recompute = useMutation(
    api.feedback.auto_tagging_jobs.recomputeFeedbackTriage
  );
  async function runTriage() {
    setStarting(true);
    try {
      await recompute({ feedbackId });
      toast.success("JEV analysis queued");
    } catch (error) {
      toast.error("Could not recompute triage", {
        description: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setStarting(false);
    }
  }
  return { runTriage, starting };
}
