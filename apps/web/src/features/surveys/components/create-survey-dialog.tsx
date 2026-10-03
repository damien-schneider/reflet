"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowLeft,
  ChatCircleText,
  FilePlus,
  Gauge,
  HandWaving,
  Lightbulb,
  Plus,
  SignOut,
  Smiley,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { TriggerPicker } from "@/features/surveys/components/trigger-picker";
import type { SurveyTemplateId } from "@/features/surveys/lib/templates";
import {
  createQuestionsFromTemplate,
  SURVEY_TEMPLATES,
} from "@/features/surveys/lib/templates";
import type { TriggerType } from "@/store/surveys";

const TEMPLATE_ICONS = {
  blank: FilePlus,
  churn: SignOut,
  csat: Smiley,
  feature_request: Lightbulb,
  nps: Gauge,
  onboarding: HandWaving,
  product_feedback: ChatCircleText,
} as const satisfies Record<SurveyTemplateId, unknown>;

interface CreateSurveyDialogProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function CreateSurveyDialog({
  organizationId,
  orgSlug,
}: CreateSurveyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<SurveyTemplateId | null>(null);

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSelectedTemplate(null);
        }
      }}
      open={isOpen}
    >
      <DialogTrigger render={<Button tone="primary" variant="solid" />}>
        <Plus aria-hidden className="size-4" />
        New survey
      </DialogTrigger>
      <DialogContent className={selectedTemplate ? "" : "sm:max-w-xl"}>
        {selectedTemplate ? (
          <ConfigureStep
            onBack={() => setSelectedTemplate(null)}
            onCreated={() => {
              setIsOpen(false);
              setSelectedTemplate(null);
            }}
            organizationId={organizationId}
            orgSlug={orgSlug}
            templateId={selectedTemplate}
          />
        ) : (
          <TemplateStep onSelect={setSelectedTemplate} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateStep({
  onSelect,
}: {
  onSelect: (templateId: SurveyTemplateId) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>New survey</DialogTitle>
        <DialogDescription>
          Start from a template or a blank survey.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SURVEY_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id];
          const questionCount = template.questions.length;
          return (
            <button
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                template.id === "blank" && "border-dashed"
              )}
              key={template.id}
              onClick={() => onSelect(template.id)}
              type="button"
            >
              <Icon aria-hidden className="size-5 text-muted-foreground" />
              <span className="font-medium text-sm">{template.name}</span>
              <span className="text-pretty text-muted-foreground text-xs">
                {template.description}
              </span>
              {questionCount > 0 ? (
                <span className="mt-1 text-muted-foreground text-xs tabular-nums">
                  {questionCount}{" "}
                  {questionCount === 1 ? "question" : "questions"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

interface ConfigureStepProps {
  onBack: () => void;
  onCreated: () => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  templateId: SurveyTemplateId;
}

function ConfigureStep({
  templateId,
  organizationId,
  onBack,
  onCreated,
  orgSlug,
}: ConfigureStepProps) {
  const router = useRouter();
  const formId = useId();
  const createSurvey = useMutation(api.surveys.mutations.create);

  const template = SURVEY_TEMPLATES.find((t) => t.id === templateId);
  const isBlank = templateId === "blank";
  const [title, setTitle] = useState(isBlank ? "" : (template?.name ?? ""));
  const [description, setDescription] = useState(
    isBlank ? "" : (template?.description ?? "")
  );
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    const questions = isBlank
      ? []
      : createQuestionsFromTemplate(templateId).map((question, order) => ({
          ...question,
          order,
        }));
    const survey = {
      description: description.trim() || undefined,
      organizationId,
      questions,
      title: title.trim(),
      triggerType,
    };
    setIsCreating(true);
    try {
      const surveyId = await createSurvey(survey);
      onCreated();
      router.push(`/dashboard/${orgSlug}/surveys/${surveyId}`);
    } catch {
      toast.error("Couldn’t create the survey. Try again.");
      setIsCreating(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isBlank ? "Blank survey" : `New survey from “${template?.name}”`}
        </DialogTitle>
        <DialogDescription>
          Name it and choose when it appears. You can change both later.
        </DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" id={formId} onSubmit={handleCreate}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-title`}>Title</Label>
          <Input
            autoFocus
            id={`${formId}-title`}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Product satisfaction"
            value={title}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-description`}>
            Description{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id={`${formId}-description`}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this survey is for"
            rows={2}
            value={description}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-sm" id={`${formId}-trigger`}>
            When should this survey appear?
          </span>
          <TriggerPicker
            density="compact"
            labelledBy={`${formId}-trigger`}
            onChange={setTriggerType}
            value={triggerType}
          />
        </div>
      </form>
      <DialogFooter>
        <Button className="sm:mr-auto" onClick={onBack} variant="ghost">
          <ArrowLeft aria-hidden className="size-4" />
          Templates
        </Button>
        <DialogClose variant="surface">Cancel</DialogClose>
        <Button
          disabled={!title.trim() || isCreating}
          form={formId}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isCreating ? "Creating…" : "Create survey"}
        </Button>
      </DialogFooter>
    </>
  );
}
