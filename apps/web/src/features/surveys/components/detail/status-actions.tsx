"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import { WarningCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FlowIssue } from "@reflet/survey-core";
import { useMutation } from "convex/react";
import { useState } from "react";
import { convexErrorMessage } from "@/features/surveys/lib/convex-error-message";
import type { SurveyStatus } from "@/store/surveys";

interface StatusTransition {
  isPrimary: boolean;
  label: string;
  pendingLabel: string;
  target: SurveyStatus;
}

const STATUS_TRANSITIONS: Record<SurveyStatus, StatusTransition[]> = {
  active: [
    {
      isPrimary: false,
      label: "Pause",
      pendingLabel: "Pausing…",
      target: "paused",
    },
  ],
  closed: [
    {
      isPrimary: false,
      label: "Reopen as draft",
      pendingLabel: "Reopening…",
      target: "draft",
    },
  ],
  draft: [
    {
      isPrimary: true,
      label: "Publish",
      pendingLabel: "Publishing…",
      target: "active",
    },
  ],
  paused: [
    {
      isPrimary: false,
      label: "Close",
      pendingLabel: "Closing…",
      target: "closed",
    },
    {
      isPrimary: true,
      label: "Resume",
      pendingLabel: "Resuming…",
      target: "active",
    },
  ],
};

export interface LocatedIssue extends FlowIssue {
  /** Which step the issue is on, e.g. “Step 2 · How likely…”. */
  stepLabel?: string;
}

interface StatusActionsProps {
  /** Errors from core `flowIssues`; any of them blocks going live. */
  blockingIssues: readonly LocatedIssue[];
  onSelectIssue: (issue: FlowIssue) => void;
  status: SurveyStatus;
  surveyId: Id<"surveys">;
}

export function StatusActions({
  blockingIssues,
  onSelectIssue,
  status,
  surveyId,
}: StatusActionsProps) {
  const updateStatus = useMutation(api.surveys.mutations.updateStatus);
  const [pendingStatus, setPendingStatus] = useState<SurveyStatus | null>(null);
  const isBlocked = blockingIssues.length > 0;

  const change = async (target: SurveyStatus) => {
    setPendingStatus(target);
    try {
      await updateStatus({ status: target, surveyId });
    } catch (error) {
      toast.error(
        convexErrorMessage(
          error,
          "Couldn’t change the survey status. Try again."
        )
      );
    }
    setPendingStatus(null);
  };

  return (
    <div className="flex items-center gap-2">
      {isBlocked && status !== "closed" ? (
        <BlockingIssues issues={blockingIssues} onSelectIssue={onSelectIssue} />
      ) : null}
      {STATUS_TRANSITIONS[status].map((transition) => (
        <Button
          disabled={
            pendingStatus !== null ||
            (transition.target === "active" && isBlocked)
          }
          key={transition.target}
          onClick={() => change(transition.target)}
          tone={transition.isPrimary ? "primary" : undefined}
          variant={transition.isPrimary ? "solid" : "surface"}
        >
          {pendingStatus === transition.target
            ? transition.pendingLabel
            : transition.label}
        </Button>
      ))}
    </div>
  );
}

function BlockingIssues({
  issues,
  onSelectIssue,
}: {
  issues: readonly LocatedIssue[];
  onSelectIssue: (issue: FlowIssue) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const count = issues.length;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger
        render={
          <Button className="text-red-700 dark:text-red-300" variant="ghost" />
        }
      >
        <WarningCircle aria-hidden weight="bold" />
        {count === 1 ? "1 thing to fix" : `${count} things to fix`}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Fix these before publishing</PopoverTitle>
          <PopoverDescription>
            Select one to jump to the step.
          </PopoverDescription>
        </PopoverHeader>
        <ul className="flex flex-col gap-0.5 pt-1">
          {issues.map((issue) => (
            <li
              key={`${issue.questionId ?? "survey"}-${issue.ruleId ?? ""}-${issue.message}`}
            >
              <button
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => {
                  setIsOpen(false);
                  onSelectIssue(issue);
                }}
                type="button"
              >
                <span className="block">{issue.message}</span>
                {issue.stepLabel ? (
                  <span className="block truncate text-muted-foreground text-xs">
                    {issue.stepLabel}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
