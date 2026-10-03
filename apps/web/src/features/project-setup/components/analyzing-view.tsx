"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@ctrl-ui/react/ui/progress";
import {
  CheckCircle,
  Circle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { H1, Muted, Text } from "@/components/ui/typography";

interface Step {
  error?: string;
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  summary?: string;
}

interface AnalyzingViewProps {
  repositoryFullName: string | undefined;
  steps: Step[];
}

const STATUS_TEXT: Record<Step["status"], string> = {
  done: "Done",
  error: "Failed",
  pending: "Waiting",
  running: "In progress",
};

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "done") {
    return (
      <CheckCircle
        aria-hidden
        className="size-5 text-success-text"
        weight="fill"
      />
    );
  }
  if (status === "running") {
    return (
      <CircleNotch
        aria-hidden
        className="size-5 text-brand-text motion-safe:animate-spin"
        weight="bold"
      />
    );
  }
  if (status === "error") {
    return (
      <WarningCircle
        aria-hidden
        className="size-5 text-destructive-text"
        weight="fill"
      />
    );
  }
  return <Circle aria-hidden className="size-5 text-muted-foreground/40" />;
}

export function AnalyzingView({
  repositoryFullName,
  steps,
}: AnalyzingViewProps) {
  const completedCount = steps.filter((s) => s.status === "done").length;
  const currentStep = steps.find((s) => s.status === "running");

  return (
    <div>
      <div className="mb-8 text-center">
        <H1 className="mb-2 text-balance">
          {repositoryFullName
            ? `Analyzing ${repositoryFullName}`
            : "Analyzing your repository"}
        </H1>
        <Muted className="text-pretty">
          This usually takes about 30 seconds.
        </Muted>
      </div>

      <ol className="space-y-1">
        {steps.map((step) => (
          <li className="flex items-start gap-3 rounded-lg p-2" key={step.key}>
            <span className="mt-0.5">
              <StepIcon status={step.status} />
            </span>
            <div className="min-w-0 flex-1">
              <Text
                className={cn(
                  step.status === "pending" && "text-muted-foreground"
                )}
                variant="bodySmall"
              >
                {step.label}
                <span className="sr-only"> ({STATUS_TEXT[step.status]})</span>
              </Text>
              {step.summary && step.status === "done" && (
                <Muted className="mt-0.5 text-caption">{step.summary}</Muted>
              )}
              {step.error && step.status === "error" && (
                <Text
                  className="mt-0.5 text-caption text-destructive-text"
                  variant="bodySmall"
                >
                  {step.error}
                </Text>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Progress
        className="mt-6 gap-2"
        max={Math.max(steps.length, 1)}
        value={completedCount}
      >
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <ProgressLabel aria-live="polite">
            {currentStep?.label ??
              (completedCount === steps.length ? "Finishing up…" : "Starting…")}
          </ProgressLabel>
          <ProgressValue className="tabular-nums">
            {() => `${completedCount} of ${steps.length}`}
          </ProgressValue>
        </div>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </div>
  );
}
