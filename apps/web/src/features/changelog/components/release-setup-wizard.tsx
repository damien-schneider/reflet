"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  GithubLogo,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ConfigureStep } from "./wizard-steps/configure-step";
import { SetupMethodStep } from "./wizard-steps/setup-method-step";
import { WorkflowStep } from "./wizard-steps/workflow-step";

const TOTAL_STEPS = 3;

export type Workflow = "ai_powered" | "automated" | "manual";

export interface WizardConfig {
  workflow: Workflow;
  syncDirection: "github_first" | "reflet_first" | "bidirectional" | "none";
  autoSyncReleases: boolean;
  pushToGithubOnPublish: boolean;
  autoPublishImported: boolean;
  autoVersioning: boolean;
  versionPrefix: string;
  versionIncrement: "patch" | "minor" | "major";
  targetBranch: string;
  manualSyncEnabled: boolean;
  manualSyncDirection:
    | "github_first"
    | "reflet_first"
    | "bidirectional"
    | "none";
}

const DEFAULT_CONFIG: WizardConfig = {
  workflow: "ai_powered",
  syncDirection: "reflet_first",
  autoSyncReleases: false,
  pushToGithubOnPublish: true,
  autoPublishImported: true,
  autoVersioning: true,
  versionPrefix: "v",
  versionIncrement: "patch",
  targetBranch: "main",
  manualSyncEnabled: false,
  manualSyncDirection: "bidirectional",
};

interface ReleaseSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ReleaseSetupWizard({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
}: ReleaseSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  const updateOrg = useMutation(api.organizations.update);
  const toggleAutoSync = useMutation(api.github.toggleAutoSync);
  const githubConnection = useQuery(api.github.getConnection, {
    organizationId,
  });

  // Initialize targetBranch from the GitHub connection's default branch
  useEffect(() => {
    if (githubConnection?.repositoryDefaultBranch) {
      setConfig((prev) => ({
        ...prev,
        targetBranch:
          prev.targetBranch === "main"
            ? (githubConnection.repositoryDefaultBranch ?? "main")
            : prev.targetBranch,
      }));
    }
  }, [githubConnection?.repositoryDefaultBranch]);

  const updateConfig = (partial: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  // When workflow changes, auto-configure internal sync settings
  const handleWorkflowChange = (workflow: Workflow) => {
    const updates: Partial<WizardConfig> = { workflow };

    if (workflow === "ai_powered") {
      updates.syncDirection = "reflet_first";
      updates.autoSyncReleases = false;
      updates.pushToGithubOnPublish = true;
      updates.autoPublishImported = true;
    } else if (workflow === "automated") {
      updates.syncDirection = "github_first";
      updates.autoSyncReleases = true;
      updates.pushToGithubOnPublish = false;
      updates.autoPublishImported = false;
    } else {
      // Manual — sync settings determined by sub-options in configure step
      updates.syncDirection = "none";
      updates.autoSyncReleases = false;
      updates.pushToGithubOnPublish = false;
      updates.autoPublishImported = false;
    }

    updateConfig(updates);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Resolve final syncDirection for manual workflow
      const finalSyncDirection =
        config.workflow === "manual" && config.manualSyncEnabled
          ? config.manualSyncDirection
          : config.syncDirection;

      const finalAutoSync =
        config.workflow === "manual" && config.manualSyncEnabled
          ? config.manualSyncDirection !== "none"
          : config.autoSyncReleases;

      const finalPushToGithub =
        config.workflow === "manual" && config.manualSyncEnabled
          ? config.manualSyncDirection === "reflet_first" ||
            config.manualSyncDirection === "bidirectional"
          : config.pushToGithubOnPublish;

      // Save changelog settings to org
      await updateOrg({
        id: organizationId,
        changelogSettings: {
          syncDirection: finalSyncDirection,
          pushToGithubOnPublish: finalPushToGithub,
          autoPublishImported: config.autoPublishImported,
          autoVersioning: config.autoVersioning,
          versionPrefix: config.versionPrefix,
          versionIncrement: config.versionIncrement,
          targetBranch: config.targetBranch,
        },
      });

      // Toggle auto-sync if GitHub is connected
      if (githubConnection) {
        await toggleAutoSync({
          organizationId,
          enabled: finalAutoSync,
        });
      }

      toast.success("Release setup completed!");
      onOpenChange(false);
      setStep(1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canGoNext = step < TOTAL_STEPS;
  const canGoBack = step > 1;
  const isLastStep = step === TOTAL_STEPS;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-140 md:max-w-140"
        showCloseButton={false}
        side="right"
        variant="panel"
      >
        {/* Header */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="flex items-center gap-2">
              <GithubLogo className="h-5 w-5" />
              Release Setup
            </SheetTitle>
            <SheetDescription>
              Step {step} of {TOTAL_STEPS} — Configure your release workflow
            </SheetDescription>
          </div>
          <SheetClose
            render={
              <Button
                onClick={() => onOpenChange(false)}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-primary" : "bg-muted"
              )}
              key={`step-${i + 1}`}
            />
          ))}
        </div>

        {/* Step content */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {step === 1 && (
              <WorkflowStep
                onBranchChange={(branch) =>
                  updateConfig({ targetBranch: branch })
                }
                onChange={handleWorkflowChange}
                organizationId={organizationId}
                targetBranch={config.targetBranch}
                value={config.workflow}
              />
            )}
            {step === 2 && (
              <ConfigureStep config={config} onChange={updateConfig} />
            )}
            {step === 3 && (
              <SetupMethodStep
                config={config}
                githubConnection={githubConnection}
                organizationId={organizationId}
                orgSlug={orgSlug}
              />
            )}
          </div>
        </ScrollArea>

        {/* Navigation */}
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-3">
          <Button
            disabled={!canGoBack}
            onClick={() => setStep((s) => s - 1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              disabled={isSaving}
              onClick={handleComplete}
              size="sm"
              type="button"
            >
              <Check className="mr-1 h-4 w-4" />
              Complete Setup
            </Button>
          ) : (
            <Button
              disabled={!canGoNext}
              onClick={() => setStep((s) => s + 1)}
              size="sm"
              type="button"
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
