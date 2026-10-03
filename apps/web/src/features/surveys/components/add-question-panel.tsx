"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Plus } from "@phosphor-icons/react";
import { type FormEvent, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { QuestionInputPreview } from "@/features/surveys/components/question-input-preview";
import { RequiredMark } from "@/features/surveys/components/required-mark";
import {
  getDefaultConfig,
  getDefaultTitle,
  QUESTION_TYPE_DESCRIPTIONS,
  QUESTION_TYPE_LABELS,
} from "@/features/surveys/lib/constants";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import type { QuestionConfig, QuestionType } from "@/store/surveys";

const QUESTION_TYPES: QuestionType[] = [
  "rating",
  "nps",
  "text",
  "single_choice",
  "multiple_choice",
  "boolean",
];

const DEFAULT_CHOICES = "Option 1\nOption 2\nOption 3";

export interface NewQuestion {
  config?: QuestionConfig;
  description?: string;
  required: boolean;
  title: string;
  type: QuestionType;
}

interface AddQuestionPanelProps {
  onAdd: (question: NewQuestion) => Promise<void>;
  onCancel: () => void;
}

function buildConfig(
  type: QuestionType,
  fields: { choices: string; maxLabel: string | null; minLabel: string | null }
): QuestionConfig | undefined {
  const hasChoices = type === "single_choice" || type === "multiple_choice";
  const parsedChoices = hasChoices
    ? fields.choices
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean)
    : undefined;
  const base = getDefaultConfig(type, parsedChoices);
  if (!(base && (type === "rating" || type === "nps"))) {
    return base;
  }
  return {
    ...base,
    maxLabel: fields.maxLabel ?? base.maxLabel,
    minLabel: fields.minLabel ?? base.minLabel,
  };
}

export function AddQuestionPanel({ onAdd, onCancel }: AddQuestionPanelProps) {
  const id = useId();
  const [type, setType] = useState<QuestionType>("rating");
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(true);
  const [choices, setChoices] = useState(DEFAULT_CHOICES);
  const [minLabel, setMinLabel] = useState<string | null>(null);
  const [maxLabel, setMaxLabel] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const title = customTitle ?? getDefaultTitle(type);
  const config = buildConfig(type, { choices, maxLabel, minLabel });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    const question = {
      config,
      description: description.trim() || undefined,
      required,
      title: title.trim(),
      type,
    };
    setIsAdding(true);
    try {
      await onAdd(question);
    } catch {
      toast.error("Couldn’t add the question. Try again.");
    }
    setIsAdding(false);
  };

  return (
    <form
      aria-labelledby={`${id}-heading`}
      className="@container overflow-hidden rounded-lg border bg-card"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
        <h3 className="font-medium text-sm" id={`${id}-heading`}>
          New question
        </h3>
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>

      <div className="grid @2xl:grid-cols-2 @2xl:divide-x">
        <div className="flex flex-col gap-4 p-4">
          <QuestionTypePicker
            id={id}
            onChange={(next) => {
              setType(next);
              setMinLabel(null);
              setMaxLabel(null);
            }}
            value={type}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-title`}>Question</Label>
            <Input
              autoFocus
              id={`${id}-title`}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. How satisfied are you?"
              value={title}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-desc`}>
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id={`${id}-desc`}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Extra context for respondents"
              value={description}
            />
          </div>
          <TypeSpecificFields
            choices={choices}
            config={config}
            id={id}
            onChoicesChange={setChoices}
            onMaxLabelChange={setMaxLabel}
            onMinLabelChange={setMinLabel}
            type={type}
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={required}
              id={`${id}-required`}
              onCheckedChange={setRequired}
            />
            <Label htmlFor={`${id}-required`}>Required</Label>
          </div>
          <div>
            <Button
              disabled={!title.trim() || isAdding}
              tone="primary"
              type="submit"
              variant="solid"
            >
              <Plus aria-hidden className="size-4" />
              {isAdding ? "Adding…" : "Add question"}
            </Button>
          </div>
        </div>

        <section
          aria-label="Question preview"
          className="border-t @2xl:border-t-0 bg-muted/20 p-4"
        >
          <p className="mb-3 font-medium text-muted-foreground text-sm">
            Preview
          </p>
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <p className="text-pretty font-medium">
              {title || "Your question here"}
              {required ? <RequiredMark /> : null}
            </p>
            {description ? (
              <p className="mt-1 text-pretty text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
            <div className="mt-4">
              <QuestionInputPreview config={config} type={type} />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}

function QuestionTypePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  onChange: (type: QuestionType) => void;
  value: QuestionType;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-sm" id={`${id}-type`}>
        Type
      </span>
      <div
        aria-describedby={`${id}-type-hint`}
        aria-labelledby={`${id}-type`}
        className="grid @md:grid-cols-3 grid-cols-2 gap-2"
        role="radiogroup"
      >
        {QUESTION_TYPES.map((option) => {
          const Icon = QUESTION_TYPE_ICONS[option];
          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/50",
                "has-checked:border-primary has-checked:bg-primary/5",
                "has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-2"
              )}
              key={option}
            >
              <input
                checked={value === option}
                className="sr-only"
                name={`${id}-type`}
                onChange={() => onChange(option)}
                type="radio"
                value={option}
              />
              <Icon
                aria-hidden
                className={cn(
                  "size-4 shrink-0",
                  value === option ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="truncate">{QUESTION_TYPE_LABELS[option]}</span>
            </label>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs" id={`${id}-type-hint`}>
        {QUESTION_TYPE_DESCRIPTIONS[value]}
      </p>
    </div>
  );
}

function TypeSpecificFields({
  id,
  type,
  config,
  choices,
  onChoicesChange,
  onMinLabelChange,
  onMaxLabelChange,
}: {
  choices: string;
  config: QuestionConfig | undefined;
  id: string;
  onChoicesChange: (value: string) => void;
  onMaxLabelChange: (value: string) => void;
  onMinLabelChange: (value: string) => void;
  type: QuestionType;
}) {
  if (type === "single_choice" || type === "multiple_choice") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-choices`}>Choices</Label>
        <Textarea
          aria-describedby={`${id}-choices-hint`}
          id={`${id}-choices`}
          onChange={(e) => onChoicesChange(e.target.value)}
          rows={4}
          value={choices}
        />
        <p className="text-muted-foreground text-xs" id={`${id}-choices-hint`}>
          One choice per line.
        </p>
      </div>
    );
  }
  if (type === "rating" || type === "nps") {
    return (
      <div className="grid @sm:grid-cols-2 grid-cols-1 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-min-label`}>Low label</Label>
          <Input
            id={`${id}-min-label`}
            onChange={(e) => onMinLabelChange(e.target.value)}
            placeholder="e.g. Poor"
            value={config?.minLabel ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-max-label`}>High label</Label>
          <Input
            id={`${id}-max-label`}
            onChange={(e) => onMaxLabelChange(e.target.value)}
            placeholder="e.g. Excellent"
            value={config?.maxLabel ?? ""}
          />
        </div>
      </div>
    );
  }
  return null;
}
