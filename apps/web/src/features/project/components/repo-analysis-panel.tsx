"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Sparkle, WarningCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { SettingsSection } from "./settings-page";

type AnalysisField =
  | "summary"
  | "techStack"
  | "architecture"
  | "features"
  | "repoStructure";

export function RepoAnalysisPanel({
  isAdmin,
  organizationId,
}: {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}) {
  const [isStarting, setIsStarting] = useState(false);

  const latestAnalysis = useQuery(
    api.integrations.github.repo_analysis.getLatestAnalysis,
    { organizationId }
  );

  const startAnalysis = useMutation(
    api.integrations.github.repo_analysis.startAnalysis
  );

  const isAnalyzing =
    latestAnalysis?.status === "pending" ||
    latestAnalysis?.status === "in_progress";
  const isBusy = isAnalyzing || isStarting;
  let actionLabel = latestAnalysis ? "Analyze again" : "Analyze repository";
  if (isBusy) {
    actionLabel = "Analyzing…";
  }

  const handleStartAnalysis = async () => {
    setIsStarting(true);
    try {
      await startAnalysis({ organizationId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t start the analysis"
      );
    }
    setIsStarting(false);
  };

  return (
    <SettingsSection
      actions={
        isAdmin ? (
          <Button
            disabled={isBusy}
            onClick={handleStartAnalysis}
            size="sm"
            variant="surface"
          >
            {isBusy ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : (
              <Sparkle aria-hidden />
            )}
            {actionLabel}
          </Button>
        ) : null
      }
      description="An AI summary of your repository, used as context for feedback."
      title="Repository analysis"
    >
      <Card>
        <CardContent aria-busy={isAnalyzing} aria-live="polite">
          {isAnalyzing || latestAnalysis === undefined ? (
            <AnalysisLoadingState />
          ) : null}

          {latestAnalysis?.status === "error" ? (
            <Alert variant="destructive">
              <WarningCircle aria-hidden />
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>
                {latestAnalysis.error ?? "Something went wrong. Try again."}
              </AlertDescription>
            </Alert>
          ) : null}

          {latestAnalysis?.status === "completed" ? (
            <AnalysisResults
              analysis={latestAnalysis}
              isAdmin={isAdmin}
              organizationId={organizationId}
            />
          ) : null}

          {latestAnalysis === null ? <AnalysisEmpty isAdmin={isAdmin} /> : null}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}

function AnalysisEmpty({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Sparkle aria-hidden className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No analysis yet</EmptyTitle>
        <EmptyDescription>
          {isAdmin
            ? "Analyze the repository to summarize its stack, architecture and features."
            : "An admin can analyze the repository to summarize its stack and features."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const SKELETON_IDS = ["summary", "tech-stack", "architecture", "features"];

function AnalysisLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      {SKELETON_IDS.map((id) => (
        <div className="flex flex-col gap-2" key={id}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

interface AnalysisResultsProps {
  analysis: {
    architecture?: string;
    completedAt?: number;
    features?: string;
    repoStructure?: string;
    summary?: string;
    techStack?: string;
  };
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

function AnalysisResults({
  analysis,
  isAdmin,
  organizationId,
}: AnalysisResultsProps) {
  const updateSection = useMutation(
    api.integrations.github.repo_analysis.updateAnalysisSection
  );

  const allSections: {
    content?: string;
    field: AnalysisField;
    title: string;
  }[] = [
    { content: analysis.summary, field: "summary", title: "Summary" },
    { content: analysis.techStack, field: "techStack", title: "Tech stack" },
    {
      content: analysis.architecture,
      field: "architecture",
      title: "Architecture",
    },
    { content: analysis.features, field: "features", title: "Features" },
    {
      content: analysis.repoStructure,
      field: "repoStructure",
      title: "Repository structure",
    },
  ];

  const sections = allSections.filter((s) => s.content);

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <div className="flex flex-col gap-2" key={section.field}>
          <h3 className="text-heading-4">{section.title}</h3>
          {isAdmin ? (
            <TiptapMarkdownEditor
              onChange={(value: string) =>
                updateSection({ field: section.field, organizationId, value })
              }
              value={section.content ?? ""}
            />
          ) : (
            <p className="text-pretty text-body text-muted-foreground">
              {section.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
