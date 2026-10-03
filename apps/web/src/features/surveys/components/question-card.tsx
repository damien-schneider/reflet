"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  ArrowDown,
  ArrowUp,
  DotsSixVertical,
  DotsThreeVertical,
  Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  QuestionEditFields,
  type QuestionUpdate,
} from "@/features/surveys/components/question-edit-fields";
import { QuestionInputPreview } from "@/features/surveys/components/question-input-preview";
import { RequiredMark } from "@/features/surveys/components/required-mark";
import { QUESTION_TYPE_LABELS } from "@/features/surveys/lib/constants";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import type { SurveyQuestion } from "@/store/surveys";

interface QuestionCardProps {
  handleProps?: Record<string, unknown>;
  isActive: boolean;
  onDelete: () => void;
  onMove: (offset: -1 | 1) => void;
  onToggle: () => void;
  onUpdate: (updates: QuestionUpdate) => void;
  position: { index: number; total: number };
  question: SurveyQuestion;
}

export function QuestionCard({
  question,
  position,
  isActive,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  handleProps,
}: QuestionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = QUESTION_TYPE_ICONS[question.type];
  const number = position.index + 1;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        isActive
          ? "border-primary ring-1 ring-primary"
          : "hover:border-foreground/20"
      )}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <Button
          aria-label={`Reorder question ${number}`}
          className="cursor-grab touch-none active:cursor-grabbing"
          iconOnly
          size="sm"
          variant="ghost"
          {...handleProps}
        >
          <DotsSixVertical aria-hidden className="size-4" />
        </Button>

        <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs tabular-nums">
          {number}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {isActive ? (
                <QuestionTitleInput
                  onSave={(title) => onUpdate({ title })}
                  title={question.title}
                />
              ) : (
                <button
                  aria-expanded={false}
                  className="block w-full py-1 text-left"
                  onClick={onToggle}
                  type="button"
                >
                  <span className="text-pretty font-medium">
                    {question.title}
                    {question.required ? <RequiredMark /> : null}
                  </span>
                </button>
              )}
            </div>
            <Badge className="mt-1 shrink-0" size="sm">
              <Icon aria-hidden className="size-3" />
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>

          {isActive ? (
            <>
              <QuestionEditFields onUpdate={onUpdate} question={question} />
              <div className="mt-4 flex justify-end">
                <Button onClick={onToggle} size="sm" variant="surface">
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              {question.description ? (
                <p className="mt-1 text-pretty text-muted-foreground text-sm">
                  {question.description}
                </p>
              ) : null}
              <div className="mt-3">
                <QuestionInputPreview
                  compact
                  config={question.config}
                  type={question.type}
                />
              </div>
            </>
          )}
        </div>

        <QuestionMenu
          number={number}
          onDelete={() => setConfirmDelete(true)}
          onMove={onMove}
          position={position}
        />
      </div>

      <DestructiveConfirmDialog
        confirmLabel="Delete question"
        description={`“${question.title}” will be removed from the survey.`}
        onConfirm={onDelete}
        onOpenChange={setConfirmDelete}
        open={confirmDelete}
        title={`Delete question ${number}?`}
      />
    </div>
  );
}

function QuestionTitleInput({
  title,
  onSave,
}: {
  onSave: (title: string) => void;
  title: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? title;

  const save = () => {
    const next = value.trim();
    if (next && next !== title) {
      onSave(next);
    }
  };

  return (
    <Input
      aria-label="Question"
      autoFocus
      onBlur={save}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          save();
        }
      }}
      value={value}
    />
  );
}

function QuestionMenu({
  number,
  position,
  onMove,
  onDelete,
}: {
  number: number;
  onDelete: () => void;
  onMove: (offset: -1 | 1) => void;
  position: { index: number; total: number };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for question ${number}`}
        iconOnly
        size="sm"
        variant="ghost"
      >
        <DotsThreeVertical aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={position.index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden className="size-4" />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={position.index === position.total - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden className="size-4" />
          Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="menu-item-danger" onClick={onDelete}>
          <Trash aria-hidden className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
