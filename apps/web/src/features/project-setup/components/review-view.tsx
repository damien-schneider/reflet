"use client";

import {
  Check,
  Copy,
  FileText,
  Lightning,
  Robot,
  Sparkle,
  Tag,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H1, Muted, Text } from "@/components/ui/typography";
import { KeywordsSection } from "@/features/project-setup/components/keywords-section";
import { LaunchBar } from "@/features/project-setup/components/launch-bar";
import { MonitorsSection } from "@/features/project-setup/components/monitors-section";
import type {
  SetupData,
  SuggestedKeyword,
  SuggestedMonitor,
  SuggestedTag,
} from "@/features/project-setup/components/review-types";
import { cn } from "@/lib/utils";

interface ReviewViewProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  setup: SetupData;
}

const WORKFLOW_LABELS = {
  ai_powered: "AI-Powered",
  automated: "Automated",
  manual: "Manual",
} as const;

export function ReviewView({
  organizationId,
  orgSlug,
  setup,
}: ReviewViewProps) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);

  const [monitors, setMonitors] = useState<SuggestedMonitor[]>(
    setup.suggestedMonitors ?? []
  );
  const [keywords, setKeywords] = useState<SuggestedKeyword[]>(
    setup.suggestedKeywords ?? []
  );
  const [tags, setTags] = useState<SuggestedTag[]>(setup.suggestedTags ?? []);

  const applySetupResults = useMutation(
    api.integrations.github.project_setup_mutations.applySetupResults
  );

  const toggleMonitor = (index: number) => {
    setMonitors((prev) =>
      prev.map((m, i) => (i === index ? { ...m, accepted: !m.accepted } : m))
    );
  };

  const toggleKeyword = (index: number) => {
    setKeywords((prev) =>
      prev.map((k, i) => (i === index ? { ...k, accepted: !k.accepted } : k))
    );
  };

  const toggleTag = (index: number) => {
    setTags((prev) =>
      prev.map((t, i) => (i === index ? { ...t, accepted: !t.accepted } : t))
    );
  };

  const toggleAllMonitors = (accepted: boolean) => {
    setMonitors((prev) => prev.map((m) => ({ ...m, accepted })));
  };

  const toggleAllKeywords = (accepted: boolean) => {
    setKeywords((prev) => prev.map((k) => ({ ...k, accepted })));
  };

  const toggleAllTags = (accepted: boolean) => {
    setTags((prev) => prev.map((t) => ({ ...t, accepted })));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleLaunch = async () => {
    if (isApplying) {
      return;
    }
    setIsApplying(true);
    try {
      await applySetupResults({
        organizationId,
        setupId: setup._id,
        acceptedMonitors: monitors
          .filter((m) => m.accepted)
          .map(({ url, name }) => ({ url, name })),
        acceptedKeywords: keywords
          .filter((k) => k.accepted)
          .map(({ keyword }) => ({ keyword, source: "both" as const })),
        acceptedTags: tags
          .filter((t) => t.accepted)
          .map(({ name, color }) => ({ name, color })),
        changelogSettings: setup.changelogConfig
          ? {
              syncDirection: setup.changelogConfig.syncDirection,
              targetBranch: setup.changelogConfig.targetBranch,
              versionPrefix: setup.changelogConfig.versionPrefix,
              autoVersioning: setup.changelogConfig.workflow !== "manual",
            }
          : undefined,
      });

      toast.success("Project configured successfully!");
      router.push(`/dashboard/${orgSlug}/project`);
    } catch (error: unknown) {
      toast.error("Failed to apply setup", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const acceptedTagsCount = tags.filter((t) => t.accepted).length;

  return (
    <div className="admin-container max-w-4xl">
      <div className="mb-8">
        <H1 className="mb-2">Review your project setup</H1>
        <Muted>
          We analyzed your repository — review and customize, then launch.
        </Muted>
      </div>

      <div className="space-y-6">
        {setup.projectOverview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkle className="size-4" />
                Project Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="bodySmall">{setup.projectOverview}</Text>
            </CardContent>
          </Card>
        )}

        <MonitorsSection
          monitors={monitors}
          onToggle={toggleMonitor}
          onToggleAll={toggleAllMonitors}
        />

        <KeywordsSection
          keywords={keywords}
          onToggle={toggleKeyword}
          onToggleAll={toggleAllKeywords}
        />

        {setup.changelogConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Changelog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setup.changelogConfig.releaseCount !== undefined &&
                  setup.changelogConfig.releaseCount > 0 && (
                    <Text variant="bodySmall">
                      Detected {setup.changelogConfig.releaseCount} existing
                      releases
                      {setup.changelogConfig.hasConventionalCommits &&
                        " with semver tags"}
                    </Text>
                  )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      setup.changelogConfig.workflow === "ai_powered"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {WORKFLOW_LABELS[setup.changelogConfig.workflow]}
                  </Badge>
                  {setup.changelogConfig.versionPrefix && (
                    <Badge variant="outline">
                      Prefix: {setup.changelogConfig.versionPrefix}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Branch: {setup.changelogConfig.targetBranch}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tags.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="size-4" />
                  Tags ({tags.length} suggested)
                </CardTitle>
                <Button
                  onClick={() => toggleAllTags(acceptedTagsCount < tags.length)}
                  size="sm"
                  variant="ghost"
                >
                  {acceptedTagsCount === tags.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                      tag.accepted
                        ? "border-foreground/20 bg-foreground/5"
                        : "border-transparent bg-muted/50 text-muted-foreground"
                    )}
                    key={tag.name}
                    onClick={() => toggleTag(index)}
                    type="button"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    {tag.accepted ? (
                      <Check className="size-3" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Robot className="size-4" />
              MCP Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="mb-2" variant="bodySmall">
              Your AI coding assistant can manage feedback, releases, and
              roadmap directly from your IDE. Configure MCP after launching from
              the AI page.
            </Text>
            <Muted className="text-xs">
              Available in Cursor, VS Code, Claude Code, Claude Desktop, and
              more.
            </Muted>
          </CardContent>
        </Card>

        {setup.suggestedPrompts && setup.suggestedPrompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightning className="size-4" />
                AI Prompts ({setup.suggestedPrompts.length} personalized)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setup.suggestedPrompts.slice(0, 3).map((prompt) => (
                  <div
                    className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3"
                    key={prompt.title}
                  >
                    <div className="flex-1">
                      <Text className="font-medium text-xs">
                        {prompt.title}
                      </Text>
                      <Muted className="mt-0.5 line-clamp-2 text-xs">
                        {prompt.prompt}
                      </Muted>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(prompt.prompt)}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <LaunchBar
          changelogConfig={setup.changelogConfig}
          isApplying={isApplying}
          keywords={keywords}
          monitors={monitors}
          onLaunch={handleLaunch}
          tags={tags}
        />
      </div>
    </div>
  );
}
