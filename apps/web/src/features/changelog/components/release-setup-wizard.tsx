"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { toast } from "@ctrl-ui/react/ui/toast";
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
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  applyWorkflowDefaults,
  DEFAULT_CONFIG,
  resolveSyncSettings,
  type WizardConfig,
  type Workflow,
} from "./wizard-config";
import { ConfigureStep } from "./wizard-steps/configure-step";
import { SetupMethodStep } from "./wizard-steps/setup-method-step";
import { WorkflowStep } from "./wizard-steps/workflow-step";

const STEP_TITLES = ["Choose a workflow", "Configure", "Finish setup"] as const;
const TOTAL_STEPS = STEP_TITLES.length;

interface ReleaseSetupWizardProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
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
  const [draftConfig, setConfig] = useState<WizardConfig>(DEFAULT_CONFIG);
  const [hasPickedBranch, setHasPickedBranch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const stepRegionRef = useRef<HTMLElement>(null);

  const goToStep = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => stepRegionRef.current?.focus());
  };

  const updateOrg = useMutation(api.organizations.mutations.update);
  const toggleAutoSync = useMutation(
    api.integrations.github.mutations.toggleAutoSync
  );
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    {
      organizationId,
    }
  );

  const shouldUseDefaultBranch =
    !hasPickedBranch && draftConfig.targetBranch === "main";
  const config: WizardConfig = {
    ...draftConfig,
    targetBranch: shouldUseDefaultBranch
      ? (githubConnection?.repositoryDefaultBranch ?? "main")
      : draftConfig.targetBranch,
  };

  const updateConfig = (partial: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleWorkflowChange = (workflow: Workflow) => {
    updateConfig({ workflow, ...applyWorkflowDefaults(workflow) });
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const sync = resolveSyncSettings(config);

      await updateOrg({
        changelogSettings: {
          autoPublishImported: sync.autoPublishImported,
          autoVersioning: config.autoVersioning,
          pushToGithubOnPublish: sync.pushToGithubOnPublish,
          targetBranch: config.targetBranch,
          versionIncrement: config.versionIncrement,
          versionPrefix: config.versionPrefix,
        },
        id: organizationId,
      });

      if (githubConnection) {
        await toggleAutoSync({
          enabled: sync.autoSyncReleases,
          organizationId,
        });
      }

      toast.success("Release setup saved");
      onOpenChange(false);
      setStep(1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn’t save release settings. Try again."
      );
    }
    setIsSaving(false);
  };

  const canGoBack = step > 1;
  const isLastStep = step === TOTAL_STEPS;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-140 md:max-w-140"
        side="right"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="flex items-center gap-2">
              <GithubLogo aria-hidden className="size-5" />
              Release setup
            </SheetTitle>
            <SheetDescription className="tabular-nums">
              Step {step} of {TOTAL_STEPS} — {STEP_TITLES[step - 1]}
            </SheetDescription>
          </div>
          <SheetClose
            render={
              <Button
                aria-label="Close"
                iconOnly
                onClick={() => onOpenChange(false)}
                size="xs"
                variant="ghost"
              />
            }
          >
            <X aria-hidden className="size-4" />
          </SheetClose>
        </SheetHeader>

        <ol aria-label="Setup progress" className="flex gap-1 px-4 pt-3">
          {STEP_TITLES.map((title, index) => {
            const stepNumber = index + 1;
            return (
              <li
                aria-current={stepNumber === step ? "step" : undefined}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-(--duration-base) ease-(--ease-standard)",
                  stepNumber <= step ? "bg-primary" : "bg-muted"
                )}
                key={title}
              >
                <span className="sr-only">{title}</span>
              </li>
            );
          })}
        </ol>

        <ScrollArea className="flex-1">
          <section
            aria-label={STEP_TITLES[step - 1]}
            className="px-4 py-4 outline-none"
            ref={stepRegionRef}
            tabIndex={-1}
          >
            {step === 1 && (
              <WorkflowStep
                onBranchChange={(branch) => {
                  setHasPickedBranch(true);
                  updateConfig({ targetBranch: branch });
                }}
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
          </section>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-between border-t px-4 py-3">
          <Button
            disabled={!canGoBack}
            onClick={() => goToStep(step - 1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              disabled={isSaving}
              onClick={handleComplete}
              size="sm"
              tone="primary"
              type="button"
              variant="solid"
            >
              <Check aria-hidden className="size-4" />
              {isSaving ? "Saving…" : "Complete setup"}
            </Button>
          ) : (
            <Button
              onClick={() => goToStep(step + 1)}
              size="sm"
              tone="primary"
              type="button"
              variant="solid"
            >
              Next
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
