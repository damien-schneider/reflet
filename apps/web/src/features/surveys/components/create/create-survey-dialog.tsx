"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ctrl-ui/react/ui/dialog";
import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import {
  ConfigureSurveyStep,
  type SurveyBlueprint,
} from "@/features/surveys/components/create/configure-survey-step";
import { DescribeSurveyStep } from "@/features/surveys/components/create/describe-survey-step";
import { TemplateGallery } from "@/features/surveys/components/create/template-gallery";

type CreateStep =
  | { kind: "gallery" }
  | { kind: "describe" }
  | {
      blueprint: SurveyBlueprint;
      cameFrom: "gallery" | "describe";
      kind: "configure";
    };

const SCRATCH_BLUEPRINT: SurveyBlueprint = {
  description: "",
  heading: "Empty flow",
  questions: [],
  title: "",
  triggerType: "manual",
};

const STEP_COPY: Record<
  CreateStep["kind"],
  { description: string; title: string }
> = {
  configure: {
    description:
      "Name it and choose when it appears. You can change both later.",
    title: "Set up your survey",
  },
  describe: {
    description:
      "Describe your goal in a sentence or two. You’ll review the draft before it goes live.",
    title: "Describe your survey",
  },
  gallery: {
    description:
      "Start from a proven flow, describe what you need, or build from scratch.",
    title: "New survey",
  },
};

interface CreateSurveyDialogProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function CreateSurveyDialog({
  organizationId,
  orgSlug,
}: CreateSurveyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<CreateStep>({ kind: "gallery" });
  const copy = STEP_COPY[step.kind];

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setStep({ kind: "gallery" });
        }
      }}
      open={isOpen}
    >
      <DialogTrigger render={<Button tone="primary" variant="solid" />}>
        <Plus aria-hidden className="size-4" />
        New survey
      </DialogTrigger>
      <DialogContent
        className={step.kind === "gallery" ? "sm:max-w-2xl" : "sm:max-w-lg"}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {step.kind === "gallery" ? (
          <div className="max-h-[65vh] overflow-y-auto py-1">
            <TemplateGallery
              onDescribe={() => setStep({ kind: "describe" })}
              onPickTemplate={(template) =>
                setStep({
                  blueprint: {
                    description: template.description,
                    endings: template.endings,
                    heading: `From “${template.name}”`,
                    questions: template.questions,
                    title: template.name,
                    triggerConfig: template.triggerConfig,
                    triggerType: template.triggerType,
                  },
                  cameFrom: "gallery",
                  kind: "configure",
                })
              }
              onStartFromScratch={() =>
                setStep({
                  blueprint: SCRATCH_BLUEPRINT,
                  cameFrom: "gallery",
                  kind: "configure",
                })
              }
            />
          </div>
        ) : null}
        {step.kind === "describe" ? (
          <DescribeSurveyStep
            onBack={() => setStep({ kind: "gallery" })}
            onDrafted={(draft) =>
              setStep({
                blueprint: {
                  description: draft.description ?? "",
                  heading: "Drafted with AI",
                  questions: draft.questions,
                  title: draft.title,
                  triggerType: "manual",
                },
                cameFrom: "describe",
                kind: "configure",
              })
            }
            organizationId={organizationId}
          />
        ) : null}
        {step.kind === "configure" ? (
          <ConfigureSurveyStep
            blueprint={step.blueprint}
            onBack={() => setStep({ kind: step.cameFrom })}
            onCreated={() => {
              setIsOpen(false);
              setStep({ kind: "gallery" });
            }}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
