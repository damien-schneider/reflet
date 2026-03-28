"use client";

import {
  CheckCircle,
  Circle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";
import { H1, Muted, Text } from "@/components/ui/typography";

interface Step {
  error?: string;
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  summary?: string;
}

interface AnalyzingViewProps {
  repositoryFullName: string;
  steps: Step[];
}

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "done") {
    return <CheckCircle className="size-5 text-emerald-500" weight="fill" />;
  }
  if (status === "running") {
    return (
      <CircleNotch
        className="size-5 animate-spin text-olive-500"
        weight="bold"
      />
    );
  }
  if (status === "error") {
    return <WarningCircle className="size-5 text-destructive" weight="fill" />;
  }
  return <Circle className="size-5 text-muted-foreground/40" />;
}

export function AnalyzingView({
  repositoryFullName,
  steps,
}: AnalyzingViewProps) {
  const completedCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div>
      <div className="mb-8 text-center">
        <H1 className="mb-2">Setting up {repositoryFullName}</H1>
        <Muted>
          AI is analyzing your codebase. This takes about 30 seconds.
        </Muted>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div className="flex items-start gap-3 rounded-lg p-2" key={step.key}>
            <div className="mt-0.5">
              <StepIcon status={step.status} />
            </div>
            <div className="flex-1">
              <Text
                className={
                  step.status === "pending"
                    ? "text-muted-foreground"
                    : undefined
                }
                variant="bodySmall"
              >
                {step.label}
              </Text>
              {step.summary && step.status === "done" && (
                <Muted className="mt-0.5 text-xs">→ {step.summary}</Muted>
              )}
              {step.error && step.status === "error" && (
                <Text
                  className="mt-0.5 text-destructive text-xs"
                  variant="bodySmall"
                >
                  {step.error}
                </Text>
              )}
            </div>
            <span className="text-muted-foreground text-xs">
              {step.status === "done" && "done"}
              {step.status === "running" && "running"}
              {step.status === "error" && "error"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Progress className="h-2" value={progressPercent} />
        <Muted className="mt-2 text-center text-xs">{progressPercent}%</Muted>
      </div>
    </div>
  );
}
