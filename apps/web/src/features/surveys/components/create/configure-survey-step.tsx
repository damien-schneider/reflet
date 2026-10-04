"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { DialogClose, DialogFooter } from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { QuestionDraft } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import type {
  SurveyEnding,
  TriggerConfig,
  TriggerType,
} from "@reflet/survey-core";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { TriggerPicker } from "@/features/surveys/components/settings/trigger-picker";
import { convexErrorMessage } from "@/lib/convex-error-message";

/** Everything a new survey starts with, whether from scratch, a template or an AI draft. */
export interface SurveyBlueprint {
  description: string;
  endings?: SurveyEnding[];
  heading: string;
  questions: QuestionDraft[];
  title: string;
  triggerConfig?: TriggerConfig;
  triggerType: TriggerType;
}

interface ConfigureSurveyStepProps {
  blueprint: SurveyBlueprint;
  onBack: () => void;
  onCreated: () => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ConfigureSurveyStep({
  blueprint,
  onBack,
  onCreated,
  organizationId,
  orgSlug,
}: ConfigureSurveyStepProps) {
  const router = useRouter();
  const formId = useId();
  const createSurvey = useMutation(api.surveys.mutations.create);
  const [title, setTitle] = useState(blueprint.title);
  const [description, setDescription] = useState(blueprint.description);
  const [triggerType, setTriggerType] = useState(blueprint.triggerType);
  const [isCreating, setIsCreating] = useState(false);
  const questionCount = blueprint.questions.length;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      const surveyId = await createSurvey({
        description: description.trim() || undefined,
        endings: blueprint.endings,
        organizationId,
        questions: blueprint.questions,
        title: title.trim(),
        triggerConfig:
          triggerType === blueprint.triggerType
            ? blueprint.triggerConfig
            : undefined,
        triggerType,
      });
      onCreated();
      router.push(`/dashboard/${orgSlug}/surveys/${surveyId}`);
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t create the survey. Try again.")
      );
      setIsCreating(false);
    }
  };

  return (
    <>
      <form className="flex flex-col gap-4" id={formId} onSubmit={handleCreate}>
        <p className="text-muted-foreground text-sm">
          {blueprint.heading}
          {questionCount > 0
            ? ` · ${questionCount === 1 ? "1 question" : `${questionCount} questions`}`
            : ""}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-title`}>Title</Label>
          <Input
            autoFocus
            id={`${formId}-title`}
            onChange={(event) => setTitle(event.target.value)}
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
            onChange={(event) => setDescription(event.target.value)}
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
          <ArrowLeft aria-hidden />
          Back
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
