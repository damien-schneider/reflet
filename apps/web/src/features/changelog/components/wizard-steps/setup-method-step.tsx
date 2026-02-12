"use client";

import { Check, ClipboardText, Robot } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WizardConfig } from "../release-setup-wizard";
import {
  generateAiPrompt,
  generateCombinedWorkflowYaml,
  generateWorkflowYaml,
} from "./setup-generators";

interface SetupMethodStepProps {
  config: WizardConfig;
  githubConnection: Doc<"githubConnections"> | null | undefined;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function SetupMethodStep({
  config,
  githubConnection,
  orgSlug,
}: SetupMethodStepProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/github/webhook`
      : "";

  const defaultBranch =
    config.targetBranch || githubConnection?.repositoryDefaultBranch || "main";
  const repoFullName = githubConnection?.repositoryFullName ?? "owner/repo";

  const workflowYaml = generateWorkflowYaml(webhookUrl, defaultBranch);
  const aiPrompt = generateAiPrompt({
    repoFullName,
    defaultBranch,
    webhookUrl,
    workflowYaml,
    config,
    orgSlug,
  });

  const handleCopy = async (content: string, tab: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(tab);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isWebhookSetup = Boolean(githubConnection?.webhookId);

  // Manual workflow with no sync
  const noSetupNeeded =
    config.workflow === "manual" && !config.manualSyncEnabled;

  if (noSetupNeeded) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          No GitHub sync configured. You can set this up later.
        </p>
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center">
          <p className="font-medium text-sm">No setup needed</p>
          <p className="text-muted-foreground text-xs">
            You can enable GitHub sync later in Settings → Releases
          </p>
        </div>
      </div>
    );
  }

  // Determine the GitHub Action YAML to show based on workflow
  const displayYaml =
    config.workflow === "automated"
      ? generateCombinedWorkflowYaml(
          webhookUrl,
          defaultBranch,
          config.versionPrefix
        )
      : workflowYaml;

  const yamlFileDescription =
    config.workflow === "automated" ? (
      <>
        Create two workflow files in your repository:{" "}
        <code className="rounded bg-muted px-1 text-[10px]">
          .github/workflows/reflet-release-sync.yml
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 text-[10px]">
          .github/workflows/release-please.yml
        </code>
      </>
    ) : (
      <>
        Create{" "}
        <code className="rounded bg-muted px-1 text-[10px]">
          .github/workflows/reflet-release-sync.yml
        </code>{" "}
        in your repository with this content:
      </>
    );

  const setupDescription = getSetupDescription(config);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{setupDescription}</p>

      {config.workflow === "ai_powered" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-blue-800 text-xs dark:text-blue-200">
            No additional setup needed for AI release notes — Reflet handles
            release note generation automatically when you click &quot;New
            Release&quot;. The workflow below enables real-time sync with
            GitHub.
          </p>
        </div>
      )}

      <Tabs defaultValue={isWebhookSetup ? "done" : "ai-prompt"}>
        <TabsList className="w-full">
          {isWebhookSetup && (
            <TabsTrigger value="done">
              <Check className="mr-1 h-3 w-3" />
              Active
            </TabsTrigger>
          )}
          <TabsTrigger value="ai-prompt">
            <Robot className="mr-1 h-3 w-3" />
            AI Prompt
          </TabsTrigger>
          <TabsTrigger value="github-action">
            <ClipboardText className="mr-1 h-3 w-3" />
            GitHub Action
          </TabsTrigger>
        </TabsList>

        {isWebhookSetup && (
          <TabsContent className="mt-3" value="done">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              <p className="font-medium text-sm">Webhook already configured</p>
              <p className="text-center text-muted-foreground text-xs">
                Real-time sync is active. GitHub events will automatically flow
                to Reflet.
              </p>
            </div>
          </TabsContent>
        )}

        <TabsContent className="mt-3" value="ai-prompt">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-muted-foreground text-xs">
                Paste this prompt into your AI coding agent (Copilot, Claude,
                Cursor) to auto-setup everything:
              </p>
              <Badge className="shrink-0 text-[10px]" variant="secondary">
                Recommended
              </Badge>
            </div>
            <div className="relative">
              <ScrollArea
                className="min-w-0 rounded-lg border bg-muted/50"
                classNameViewport="max-h-[200px]"
                direction="both"
              >
                <pre className="overflow-x-auto whitespace-pre p-3 pr-20 font-mono text-[11px] leading-relaxed">
                  {aiPrompt}
                </pre>
              </ScrollArea>
              <Button
                className="absolute top-2 right-2 h-7"
                onClick={() => handleCopy(aiPrompt, "ai")}
                size="sm"
                type="button"
                variant="secondary"
              >
                {copiedTab === "ai" ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardText className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {config.workflow === "automated"
                ? "Both workflows use GitHub Actions' built-in token ($GITHUB_TOKEN) — no additional tokens or secrets needed. Works with both public and private repositories."
                : "The workflow uses GitHub Actions' built-in token ($GITHUB_TOKEN) which is automatically available — you don't need to create, generate, or configure any token or secret. Works with both public and private repositories."}
            </p>
          </div>
        </TabsContent>

        <TabsContent className="mt-3" value="github-action">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              {yamlFileDescription}
            </p>
            <div className="relative">
              <ScrollArea
                className="min-w-0 rounded-lg border bg-muted/50"
                classNameViewport="max-h-[200px]"
                direction="both"
              >
                <pre className="overflow-x-auto whitespace-pre p-3 pr-20 font-mono text-[11px] leading-relaxed">
                  {displayYaml}
                </pre>
              </ScrollArea>
              <Button
                className="absolute top-2 right-2 h-7"
                onClick={() => handleCopy(displayYaml, "yaml")}
                size="sm"
                type="button"
                variant="secondary"
              >
                {copiedTab === "yaml" ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardText className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {config.workflow === "automated"
                ? "Both workflows use GitHub Actions' built-in token, which is automatically available. You don't need to create any token or add any secret — just commit the files."
                : "This workflow uses GitHub Actions' built-in token, which is automatically available in every workflow run. You don't need to create any token or add any secret — just commit the file. Works with both public and private repositories."}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getSetupDescription(config: WizardConfig): string {
  switch (config.workflow) {
    case "ai_powered":
      return "Set up the GitHub webhook to enable real-time sync:";
    case "automated":
      return "Set up the release automation and sync workflows:";
    case "manual":
      return "Set up the GitHub webhook to keep releases in sync:";
    default:
      return "Choose how to connect GitHub to Reflet:";
  }
}
