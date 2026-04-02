"use client";

import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { Muted, Text } from "@/components/ui/typography";

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

  const handleStartAnalysis = async () => {
    setIsStarting(true);
    try {
      await startAnalysis({ organizationId });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Analysis</CardTitle>
        <CardDescription>
          AI-powered analysis of your repository
        </CardDescription>
        {isAdmin ? (
          <CardAction>
            <Button
              disabled={isAnalyzing || isStarting}
              onClick={handleStartAnalysis}
              size="sm"
              variant="outline"
            >
              {isAnalyzing || isStarting ? (
                <ArrowsClockwise className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkle className="mr-1.5 h-4 w-4" />
              )}
              {latestAnalysis ? "Re-analyse" : "Analyse Repo"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isAnalyzing ? <AnalysisLoadingState /> : null}

        {latestAnalysis?.status === "error" ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <Text className="text-destructive" variant="bodySmall">
              Analysis failed: {latestAnalysis.error ?? "Unknown error"}
            </Text>
          </div>
        ) : null}

        {latestAnalysis?.status === "completed" ? (
          <AnalysisResults
            analysis={latestAnalysis}
            isAdmin={isAdmin}
            organizationId={organizationId}
          />
        ) : null}

        {latestAnalysis || isAnalyzing ? null : (
          <div className="py-4 text-center">
            <Muted>Nothing yet</Muted>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SKELETON_IDS = ["summary", "tech-stack", "architecture", "features"];

function AnalysisLoadingState() {
  return (
    <div className="space-y-6">
      {SKELETON_IDS.map((id) => (
        <div className="space-y-2" key={id}>
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
    { title: "Summary", field: "summary", content: analysis.summary },
    { title: "Tech Stack", field: "techStack", content: analysis.techStack },
    {
      title: "Architecture",
      field: "architecture",
      content: analysis.architecture,
    },
    { title: "Features", field: "features", content: analysis.features },
    {
      title: "Repository Structure",
      field: "repoStructure",
      content: analysis.repoStructure,
    },
  ];

  const sections = allSections.filter((s) => s.content);

  const handleSectionChange = async (field: AnalysisField, value: string) => {
    await updateSection({
      organizationId,
      field,
      value,
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div className="space-y-2" key={section.field}>
          <Text className="font-medium text-sm">{section.title}</Text>
          {isAdmin ? (
            <TiptapMarkdownEditor
              onChange={(value: string) =>
                handleSectionChange(section.field, value)
              }
              value={section.content ?? ""}
            />
          ) : (
            <Text variant="bodySmall">{section.content}</Text>
          )}
        </div>
      ))}
    </div>
  );
}
