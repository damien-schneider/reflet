"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TriggerPickerCompact } from "@/features/surveys/components/trigger-picker";
import type { SurveyTemplateId } from "@/features/surveys/lib/templates";
import {
  createQuestionsFromTemplate,
  SURVEY_TEMPLATES,
} from "@/features/surveys/lib/templates";
import { cn } from "@/lib/utils";
import type { TriggerType } from "@/store/surveys";

type Step = "template" | "configure";

interface CreateSurveyDialogProps {
  organizationId: Id<"organizations">;
}

export function CreateSurveyDialog({
  organizationId,
}: CreateSurveyDialogProps) {
  const createSurvey = useMutation(api.surveys.mutations.create);
  const addQuestion = useMutation(api.surveys.questions.addQuestion);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("template");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [selectedTemplate, setSelectedTemplate] =
    useState<SurveyTemplateId>("blank");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectTemplate = (templateId: SurveyTemplateId) => {
    setSelectedTemplate(templateId);
    const template = SURVEY_TEMPLATES.find((t) => t.id === templateId);
    if (template && templateId !== "blank") {
      setTitle(template.name);
      setDescription(template.description);
    } else {
      setTitle("");
      setDescription("");
    }
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const surveyId = await createSurvey({
        organizationId,
        title: title.trim(),
        description: description.trim() || undefined,
        triggerType,
        questions: [],
      });

      if (selectedTemplate !== "blank") {
        const questions = createQuestionsFromTemplate(selectedTemplate);
        for (const [index, q] of questions.entries()) {
          await addQuestion({
            surveyId,
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            order: index,
            config: q.config,
          });
        }
      }

      toast.success("Survey created");
      setIsOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create survey");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep("template");
    setTitle("");
    setDescription("");
    setTriggerType("manual");
    setSelectedTemplate("blank");
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
      open={isOpen}
    >
      <DialogTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm shadow-sm hover:bg-primary/90">
        <Plus className="mr-1.5 size-4" />
        New Survey
      </DialogTrigger>
      <DialogContent className={step === "template" ? "sm:max-w-xl" : ""}>
        {step === "template" ? (
          <>
            <DialogHeader>
              <DialogTitle>New Survey</DialogTitle>
              <DialogDescription>
                Start from a template or create a blank survey.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {SURVEY_TEMPLATES.map((t) => {
                const isBlank = t.id === "blank";
                return (
                  <button
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isBlank && "border-dashed"
                    )}
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    type="button"
                  >
                    <span className="text-lg">{t.icon}</span>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {t.description}
                    </p>
                    {t.questions.length > 0 ? (
                      <span className="mt-1 text-[11px] text-muted-foreground">
                        {t.questions.length} question
                        {t.questions.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate === "blank"
                  ? "Create Blank Survey"
                  : `Create from ${SURVEY_TEMPLATES.find((t) => t.id === selectedTemplate)?.name ?? "Template"}`}
              </DialogTitle>
              <DialogDescription>
                <button
                  className="text-primary hover:underline"
                  onClick={() => setStep("template")}
                  type="button"
                >
                  Change template
                </button>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-title">Title</Label>
                <Input
                  autoFocus
                  id="survey-title"
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Product Satisfaction"
                  value={title}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-desc">
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="survey-desc"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this survey"
                  rows={2}
                  value={description}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>When should this survey appear?</Label>
                <TriggerPickerCompact
                  onChange={setTriggerType}
                  value={triggerType}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 font-medium text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
                Cancel
              </DialogClose>
              <Button
                disabled={!title.trim() || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? "Creating..." : "Create Survey"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
