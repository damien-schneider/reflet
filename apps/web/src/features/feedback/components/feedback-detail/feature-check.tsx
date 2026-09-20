"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  CheckCircle,
  Code,
  GitBranch,
  MagnifyingGlass,
  Question,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FeatureCheckProps {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
}

interface EvidenceItem {
  filePath: string;
  relevance: string;
  snippet?: string;
}

const RESULT_CONFIG = {
  implemented: {
    className: "bg-success-subtle text-success-text border-success/30",
    icon: CheckCircle,
    iconClassName: "text-success-text",
    label: "Implemented",
  },
  inconclusive: {
    className: "bg-muted text-muted-foreground border-border",
    icon: Question,
    iconClassName: "text-muted-foreground",
    label: "Inconclusive",
  },
  not_implemented: {
    className:
      "bg-destructive-subtle text-destructive-text border-destructive/30",
    icon: XCircle,
    iconClassName: "text-destructive-text",
    label: "Not Implemented",
  },
  partially_implemented: {
    className: "bg-warning-subtle text-warning-text border-warning/30",
    icon: Warning,
    iconClassName: "text-warning-text",
    label: "Partially Implemented",
  },
} as const;

export function FeatureCheck({
  feedbackId,
  organizationId,
}: FeatureCheckProps) {
  const connectionStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );

  const featureCheck = useQuery(
    api.feedback.feature_check.getFeatureCheckStatus,
    { feedbackId }
  );

  const startFeatureCheck = useMutation(
    api.feedback.feature_check.startFeatureCheck
  );

  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startFeatureCheck({ feedbackId });
    } finally {
      setIsStarting(false);
    }
  };

  if (connectionStatus === undefined) {
    return null;
  }

  const hasGithubConnection = Boolean(
    connectionStatus?.isConnected && connectionStatus?.hasRepository
  );
  const isPending =
    featureCheck?.status === "pending" || featureCheck?.status === "checking";
  const hasResult = featureCheck?.status === "completed" && featureCheck.result;
  const hasError = featureCheck?.status === "error";

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <FeatureCheckHeader
            hasGithubConnection={hasGithubConnection}
            hasResult={Boolean(hasResult)}
            isPending={isPending}
            isStarting={isStarting}
            onStart={handleStart}
          />

          <FeatureCheckBody
            featureCheck={featureCheck}
            hasError={hasError}
            hasGithubConnection={hasGithubConnection}
            hasResult={Boolean(hasResult)}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCheckHeader({
  hasGithubConnection,
  isPending,
  isStarting,
  hasResult,
  onStart,
}: {
  hasGithubConnection: boolean;
  hasResult: boolean;
  isPending: boolean;
  isStarting: boolean;
  onStart: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium text-sm">Feature Implementation Check</span>
      {hasGithubConnection ? (
        <Button
          disabled={isPending || isStarting}
          onClick={onStart}
          size="xs"
          variant="surface"
        >
          {isPending ? (
            <>
              <ArrowsClockwise className="mr-1 h-3 w-3 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <MagnifyingGlass className="mr-1 h-3 w-3" />
              {hasResult ? "Recheck" : "Check Codebase"}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

function FeatureCheckBody({
  hasGithubConnection,
  isPending,
  hasError,
  hasResult,
  featureCheck,
}: {
  featureCheck:
    | {
        error?: string;
        evidence?: EvidenceItem[];
        generatedAt?: number;
        result?: keyof typeof RESULT_CONFIG;
        status?: string;
        summary?: string;
      }
    | null
    | undefined;
  hasError: boolean;
  hasGithubConnection: boolean;
  hasResult: boolean;
  isPending: boolean;
}) {
  if (!hasGithubConnection) {
    return (
      <p className="mt-1 text-muted-foreground text-xs">
        Connect a GitHub repository in Settings &gt; GitHub to check if this
        feature is already implemented.
      </p>
    );
  }

  if (isPending) {
    return (
      <p className="mt-2 text-muted-foreground text-xs">
        Searching the connected GitHub repository for this feature...
      </p>
    );
  }

  if (hasError && featureCheck?.error) {
    return (
      <p className="mt-2 text-destructive text-xs">{featureCheck.error}</p>
    );
  }

  if (hasResult && featureCheck?.result) {
    return <FeatureCheckResult featureCheck={featureCheck} />;
  }

  return (
    <p className="mt-1 text-muted-foreground text-xs">
      Check if this feature is already implemented in the codebase.
    </p>
  );
}

function FeatureCheckResult({
  featureCheck,
}: {
  featureCheck: {
    evidence?: EvidenceItem[];
    generatedAt?: number;
    result?: keyof typeof RESULT_CONFIG;
    summary?: string;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!featureCheck.result) {
    return null;
  }

  return (
    <div className="mt-2">
      <ResultBadge result={featureCheck.result} />

      {featureCheck.summary && (
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          {featureCheck.summary}
        </p>
      )}

      {featureCheck.evidence && featureCheck.evidence.length > 0 && (
        <EvidenceList
          evidence={featureCheck.evidence}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((prev) => !prev)}
        />
      )}

      {featureCheck.generatedAt && (
        <p className="mt-2 text-muted-foreground/60 text-xs">
          Checked {new Date(featureCheck.generatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function EvidenceList({
  evidence,
  isExpanded,
  onToggle,
}: {
  evidence: EvidenceItem[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-2">
      <Button
        className="h-auto gap-1 p-0 text-muted-foreground text-xs"
        onClick={onToggle}
        variant="quiet"
      >
        <Code className="h-3 w-3" />
        {evidence.length} file{evidence.length === 1 ? "" : "s"} found
        {isExpanded ? (
          <CaretUp className="h-3 w-3" />
        ) : (
          <CaretDown className="h-3 w-3" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {evidence.map((item) => (
            <div
              className="rounded border bg-muted/50 px-3 py-2"
              key={item.filePath}
            >
              <p className="font-mono text-xs">{item.filePath}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {item.relevance}
              </p>
              {item.snippet && (
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                  {item.snippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: keyof typeof RESULT_CONFIG }) {
  const config = RESULT_CONFIG[result];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs",
        config.className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} weight="fill" />
      {config.label}
    </span>
  );
}
