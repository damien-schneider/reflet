"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Check, ClipboardText, Robot } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import type { WizardConfig } from "../wizard-config";
import {
  generateAiPrompt,
  generateAutoReleaseWorkflowYaml,
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

  const appUrl = typeof window === "undefined" ? "" : window.location.origin;

  const defaultBranch =
    config.targetBranch || githubConnection?.repositoryDefaultBranch || "main";
  const repoFullName = githubConnection?.repositoryFullName ?? "owner/repo";

  const aiPrompt = generateAiPrompt({
    appUrl,
    config,
    defaultBranch,
    orgSlug,
    repoFullName,
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

  const noSetupNeeded =
    config.workflow === "manual" && !config.manualSyncEnabled;

  if (noSetupNeeded) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          No GitHub sync configured. You can set this up later.
        </p>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Check className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No setup needed</EmptyTitle>
            <EmptyDescription>
              You can enable GitHub sync later in Settings → Releases
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const hasReleaseAutomation = config.workflow === "automated";
  const displayYaml = hasReleaseAutomation
    ? generateAutoReleaseWorkflowYaml(defaultBranch, config.versionPrefix)
    : null;

  const setupDescription = getSetupDescription(config);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{setupDescription}</p>

      {config.workflow === "ai_powered" && (
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="text-muted-foreground text-xs">
            No setup needed — Reflet generates release notes when you click
            &quot;New Release&quot;, and the Reflet GitHub App already keeps
            releases in sync.
          </p>
        </div>
      )}

      <Tabs defaultValue={isWebhookSetup ? "done" : "ai-prompt"}>
        <TabsList className="w-full">
          {isWebhookSetup && (
            <TabsTab value="done">
              <Check className="mr-1 h-3 w-3" />
              Active
            </TabsTab>
          )}
          <TabsTab value="ai-prompt">
            <Robot className="mr-1 h-3 w-3" />
            AI Prompt
          </TabsTab>
          {hasReleaseAutomation && (
            <TabsTab value="github-action">
              <ClipboardText className="mr-1 h-3 w-3" />
              GitHub Action
            </TabsTab>
          )}
        </TabsList>

        {isWebhookSetup && (
          <TabsPanel className="mt-3" value="done">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-success-subtle p-4">
              <Check className="h-8 w-8 text-success-text" />
              <p className="font-medium text-sm">Webhook already configured</p>
              <p className="text-center text-muted-foreground text-xs">
                Real-time sync is active. GitHub events will automatically flow
                to Reflet.
              </p>
            </div>
          </TabsPanel>
        )}

        <TabsPanel className="mt-3" value="ai-prompt">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-muted-foreground text-xs">
                Paste this prompt into your AI coding agent (Copilot, Claude,
                Cursor) to auto-setup everything:
              </p>
              <Badge className="shrink-0 text-caption">Recommended</Badge>
            </div>
            <div className="relative">
              <ScrollArea
                className="min-w-0 rounded-lg border bg-muted/50"
                viewportClassName="max-h-[200px]"
              >
                <pre className="overflow-x-auto whitespace-pre p-3 pr-20 font-mono text-caption leading-relaxed">
                  {aiPrompt}
                </pre>
              </ScrollArea>
              <Button
                className="absolute top-2 right-2 h-7"
                onClick={() => handleCopy(aiPrompt, "ai")}
                size="xs"
                tone="primary"
                type="button"
                variant="surface"
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
            <p className="text-caption text-muted-foreground">
              {hasReleaseAutomation
                ? "release-please uses GitHub Actions' built-in token ($GITHUB_TOKEN) — no additional tokens or secrets needed. Works with both public and private repositories."
                : "Sync runs through the Reflet GitHub App — no token, secret or workflow file to add."}
            </p>
          </div>
        </TabsPanel>

        {displayYaml && (
          <TabsPanel className="mt-3" value="github-action">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Create{" "}
                <code className="rounded bg-muted px-1 text-caption">
                  .github/workflows/release-please.yml
                </code>{" "}
                in your repository with this content:
              </p>
              <div className="relative">
                <ScrollArea
                  className="min-w-0 rounded-lg border bg-muted/50"
                  viewportClassName="max-h-[200px]"
                >
                  <pre className="overflow-x-auto whitespace-pre p-3 pr-20 font-mono text-caption leading-relaxed">
                    {displayYaml}
                  </pre>
                </ScrollArea>
                <Button
                  className="absolute top-2 right-2 h-7"
                  onClick={() => handleCopy(displayYaml, "yaml")}
                  size="xs"
                  tone="primary"
                  type="button"
                  variant="surface"
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
              <p className="text-caption text-muted-foreground">
                release-please uses GitHub Actions&apos; built-in token, which
                is automatically available. Just commit the file.
              </p>
            </div>
          </TabsPanel>
        )}
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
