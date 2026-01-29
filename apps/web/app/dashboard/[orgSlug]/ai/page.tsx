"use client";

import {
  ArrowsClockwise,
  Brain,
  GitBranch,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { H1, H2, Muted, Text } from "@/components/ui/typography";
import { WebsiteReferenceList } from "@/features/ai-context/components/website-reference-list";

export default function AIPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const [isStarting, setIsStarting] = useState(false);

  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const githubStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const latestAnalysis = useQuery(
    api.repo_analysis.getLatestAnalysis,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const startAnalysis = useMutation(api.repo_analysis.startAnalysis);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const handleStartAnalysis = async () => {
    if (!org?._id) {
      return;
    }
    setIsStarting(true);
    try {
      await startAnalysis({ organizationId: org._id as Id<"organizations"> });
    } finally {
      setIsStarting(false);
    }
  };

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (!githubStatus?.hasRepository) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <GitBranch className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <H2 variant="card">No GitHub Repository Connected</H2>
          <Muted className="mt-2">
            Connect a GitHub repository in Settings to use AI features.
          </Muted>
        </div>
      </div>
    );
  }

  const isAnalyzing =
    latestAnalysis?.status === "pending" ||
    latestAnalysis?.status === "in_progress";

  return (
    <div className="admin-container">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-olive-600" />
          <div>
            <H1>AI Context</H1>
            <Text variant="bodySmall">
              AI-powered analysis and context for better feedback understanding
            </Text>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Repository Analysis Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <H2 variant="card">Repository Analysis</H2>
              <Text className="mt-1" variant="bodySmall">
                AI-powered analysis of {githubStatus.repositoryFullName}
              </Text>
            </div>
            {isAdmin && (
              <Button
                disabled={isAnalyzing || isStarting}
                onClick={handleStartAnalysis}
                variant="outline"
              >
                {isAnalyzing || isStarting ? (
                  <ArrowsClockwise className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkle className="mr-2 h-4 w-4" />
                )}
                {latestAnalysis ? "Re-analyse" : "Analyse Repo"}
              </Button>
            )}
          </div>

          {isAnalyzing && <AnalysisLoadingState />}

          {latestAnalysis?.status === "error" && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4">
                <p className="text-destructive text-sm">
                  Analysis failed: {latestAnalysis.error || "Unknown error"}
                </p>
              </CardContent>
            </Card>
          )}

          {latestAnalysis?.status === "completed" && org._id && (
            <AnalysisResults
              analysis={latestAnalysis}
              isAdmin={isAdmin}
              organizationId={org._id as Id<"organizations">}
            />
          )}

          {!(latestAnalysis || isAnalyzing) && (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click &quot;Analyse Repo&quot; to generate an AI-powered
                  analysis of your repository.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Website References Section */}
        {org._id && (
          <section>
            <div className="mb-4">
              <H2 variant="card">Website References</H2>
              <Text className="mt-1" variant="bodySmall">
                Add website URLs to provide additional context for AI
                clarifications
              </Text>
            </div>
            <WebsiteReferenceList
              isAdmin={isAdmin}
              organizationId={org._id as Id<"organizations">}
            />
          </section>
        )}
      </div>
    </div>
  );
}

const SKELETON_IDS = ["summary", "tech-stack", "architecture", "features"];

function AnalysisLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SKELETON_IDS.map((id) => (
        <Card key={id}>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type AnalysisField =
  | "summary"
  | "techStack"
  | "architecture"
  | "features"
  | "repoStructure";

interface AnalysisResultsProps {
  analysis: {
    summary?: string;
    techStack?: string;
    architecture?: string;
    features?: string;
    repoStructure?: string;
    completedAt?: number;
  };
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

function AnalysisResults({
  analysis,
  organizationId,
  isAdmin,
}: AnalysisResultsProps) {
  const updateSection = useMutation(api.repo_analysis.updateAnalysisSection);

  const allSections: {
    title: string;
    field: AnalysisField;
    content?: string;
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
    <div className="space-y-4">
      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <TiptapMarkdownEditor
                className="w-full border-0 bg-transparent p-0 focus-within:ring-0 dark:bg-transparent"
                debounceMs={500}
                editable={isAdmin}
                onChange={(value) => handleSectionChange(section.field, value)}
                placeholder={`Enter ${section.title.toLowerCase()}...`}
                value={section.content || ""}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      {analysis.completedAt && (
        <p className="text-muted-foreground/60 text-xs">
          Analysis completed on{" "}
          {new Date(analysis.completedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
