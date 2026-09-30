"use client";

import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { QuestionInputPreview } from "@/features/surveys/components/question-input-preview";
import type { QuestionConfig, SurveyQuestion } from "@/store/surveys";

export interface QuestionUpdate {
  config?: QuestionConfig;
  description?: string;
  required?: boolean;
  title?: string;
}

interface QuestionEditFieldsProps {
  onUpdate: (updates: QuestionUpdate) => void;
  question: SurveyQuestion;
}

export function QuestionEditFields({
  question,
  onUpdate,
}: QuestionEditFieldsProps) {
  const [description, setDescription] = useState(question.description ?? "");
  const id = question._id;

  const saveDescription = () => {
    const next = description.trim();
    if (next !== (question.description ?? "")) {
      onUpdate({ description: next || undefined });
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>
          Description{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${id}-description`}
          onBlur={saveDescription}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Extra context for respondents"
          value={description}
        />
      </div>

      <TypeFields onUpdate={onUpdate} question={question} />

      <div className="flex items-center gap-2">
        <Switch
          checked={question.required}
          id={`${id}-required`}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
        <Label htmlFor={`${id}-required`}>Required</Label>
      </div>

      <section
        aria-label="Question preview"
        className="rounded-lg bg-muted/30 p-4"
      >
        <p className="mb-2 font-medium text-muted-foreground text-sm">
          Preview
        </p>
        <QuestionInputPreview config={question.config} type={question.type} />
      </section>
    </div>
  );
}

function TypeFields({ question, onUpdate }: QuestionEditFieldsProps) {
  const [choices, setChoices] = useState(
    () => question.config?.choices?.join("\n") ?? ""
  );
  const [minLabel, setMinLabel] = useState(question.config?.minLabel ?? "");
  const [maxLabel, setMaxLabel] = useState(question.config?.maxLabel ?? "");
  const id = question._id;

  const saveChoices = () => {
    const parsed = choices
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      onUpdate({ config: { ...question.config, choices: parsed } });
    }
  };

  const saveRangeLabels = () => {
    if (
      minLabel !== (question.config?.minLabel ?? "") ||
      maxLabel !== (question.config?.maxLabel ?? "")
    ) {
      onUpdate({ config: { ...question.config, maxLabel, minLabel } });
    }
  };

  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-choices`}>Choices</Label>
        <Textarea
          aria-describedby={`${id}-choices-hint`}
          id={`${id}-choices`}
          onBlur={saveChoices}
          onChange={(e) => setChoices(e.target.value)}
          rows={4}
          value={choices}
        />
        <p className="text-muted-foreground text-xs" id={`${id}-choices-hint`}>
          One choice per line.
        </p>
      </div>
    );
  }

  if (question.type === "rating" || question.type === "nps") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-min-label`}>Low label</Label>
          <Input
            id={`${id}-min-label`}
            onBlur={saveRangeLabels}
            onChange={(e) => setMinLabel(e.target.value)}
            placeholder="e.g. Poor"
            value={minLabel}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-max-label`}>High label</Label>
          <Input
            id={`${id}-max-label`}
            onBlur={saveRangeLabels}
            onChange={(e) => setMaxLabel(e.target.value)}
            placeholder="e.g. Excellent"
            value={maxLabel}
          />
        </div>
      </div>
    );
  }

  return null;
}
