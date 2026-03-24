"use client";

import {
  ChartBar,
  CheckSquare,
  DotsSixVertical,
  RadioButton,
  Star,
  TextAa,
  ToggleLeft,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { QuestionInputPreview } from "@/features/surveys/components/question-input-preview";
import { QUESTION_TYPE_LABELS } from "@/features/surveys/lib/constants";
import { cn } from "@/lib/utils";
import type { QuestionConfig, QuestionType } from "@/store/surveys";

const QUESTION_TYPE_ICON_MAP = {
  rating: Star,
  nps: ChartBar,
  text: TextAa,
  single_choice: RadioButton,
  multiple_choice: CheckSquare,
  boolean: ToggleLeft,
} as const;

interface QuestionCardProps {
  dragHandleProps?: Record<string, unknown>;
  index: number;
  isActive: boolean;
  onActivate: () => void;
  onDelete: (id: Id<"surveyQuestions">) => void;
  onUpdate: (updates: {
    config?: QuestionConfig;
    description?: string;
    required?: boolean;
    title?: string;
  }) => void;
  question: {
    _id: Id<"surveyQuestions">;
    config?: QuestionConfig;
    description?: string;
    order: number;
    required: boolean;
    title: string;
    type: QuestionType;
  };
}

export function QuestionCard({
  question,
  index,
  isActive,
  onActivate,
  onUpdate,
  onDelete,
  dragHandleProps,
}: QuestionCardProps) {
  const [editTitle, setEditTitle] = useState(question.title);
  const [editDescription, setEditDescription] = useState(
    question.description ?? ""
  );
  const [editChoices, setEditChoices] = useState(
    question.config?.choices?.join("\n") ?? ""
  );

  const Icon = QUESTION_TYPE_ICON_MAP[question.type];
  const hasChoices =
    question.type === "single_choice" || question.type === "multiple_choice";
  const hasRange = question.type === "rating" || question.type === "nps";

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== question.title) {
      onUpdate({ title: editTitle.trim() });
    }
  };

  const handleSaveDescription = () => {
    const desc = editDescription.trim();
    if (desc !== (question.description ?? "")) {
      onUpdate({ description: desc || undefined });
    }
  };

  const handleSaveChoices = () => {
    const choices = editChoices
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (choices.length > 0) {
      onUpdate({ config: { ...question.config, choices } });
    }
  };

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card transition-all",
        isActive
          ? "ring-2 ring-primary ring-offset-2"
          : "hover:border-foreground/20"
      )}
    >
      <div className="flex items-start gap-2 p-4">
        <button
          className="mt-1.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          type="button"
          {...dragHandleProps}
        >
          <DotsSixVertical className="size-4" />
        </button>

        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {/* Header: title + type badge */}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {isActive ? (
                <Input
                  autoFocus
                  className="font-medium"
                  onBlur={handleSaveTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle();
                    }
                  }}
                  value={editTitle}
                />
              ) : (
                <button
                  className="block w-full text-left"
                  onClick={onActivate}
                  type="button"
                >
                  <span className="font-medium">
                    {question.title}
                    {question.required ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </span>
                </button>
              )}
            </div>
            <Badge className="shrink-0" variant="secondary">
              <Icon className="mr-1 size-3" />
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>

          {/* Description */}
          {isActive ? (
            <div className="mt-2">
              <Input
                className="text-sm"
                onBlur={handleSaveDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add description (optional)"
                value={editDescription}
              />
            </div>
          ) : null}
          {!isActive && question.description ? (
            <p className="mt-1 text-muted-foreground text-sm">
              {question.description}
            </p>
          ) : null}

          {/* Inline mini-preview when collapsed */}
          {isActive ? null : (
            <div className="mt-3">
              <QuestionInputPreview
                compact
                config={question.config}
                type={question.type}
              />
            </div>
          )}

          {/* Expanded editing panel */}
          {isActive ? (
            <div className="mt-4 space-y-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={question.required}
                  id={`required-${question._id}`}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                />
                <Label htmlFor={`required-${question._id}`}>Required</Label>
              </div>

              {hasChoices ? (
                <div>
                  <Label>Choices (one per line)</Label>
                  <Textarea
                    className="mt-1"
                    onBlur={handleSaveChoices}
                    onChange={(e) => setEditChoices(e.target.value)}
                    rows={4}
                    value={editChoices}
                  />
                </div>
              ) : null}

              {hasRange ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Low label</Label>
                    <Input
                      className="mt-1"
                      onBlur={() =>
                        onUpdate({
                          config: {
                            ...question.config,
                            minLabel: question.config?.minLabel,
                          },
                        })
                      }
                      onChange={(e) =>
                        onUpdate({
                          config: {
                            ...question.config,
                            minLabel: e.target.value,
                          },
                        })
                      }
                      value={question.config?.minLabel ?? ""}
                    />
                  </div>
                  <div>
                    <Label>High label</Label>
                    <Input
                      className="mt-1"
                      onBlur={() =>
                        onUpdate({
                          config: {
                            ...question.config,
                            maxLabel: question.config?.maxLabel,
                          },
                        })
                      }
                      onChange={(e) =>
                        onUpdate({
                          config: {
                            ...question.config,
                            maxLabel: e.target.value,
                          },
                        })
                      }
                      value={question.config?.maxLabel ?? ""}
                    />
                  </div>
                </div>
              ) : null}

              {/* Live preview in editing mode */}
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Preview
                </p>
                <QuestionInputPreview
                  config={question.config}
                  type={question.type}
                />
              </div>
            </div>
          ) : null}
        </div>

        <Button
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(question._id)}
          size="sm"
          variant="ghost"
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </div>
  );
}
