"use client";

import {
  ChartBar,
  CheckSquare,
  RadioButton,
  Star,
  TextAa,
  ToggleLeft,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { H3, Muted, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { QuestionType, SurveyQuestion } from "@/store/surveys";

const ICON_MAP = {
  rating: Star,
  nps: ChartBar,
  text: TextAa,
  single_choice: RadioButton,
  multiple_choice: CheckSquare,
  boolean: ToggleLeft,
} as const;

interface SurveyPreviewProps {
  description?: string;
  questions: SurveyQuestion[];
  title: string;
}

export function SurveyPreview({
  title,
  description,
  questions,
}: SurveyPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, unknown>>(new Map());

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <Muted>Add questions to see a preview</Muted>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return null;
  }

  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;
  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/30 p-4">
        <H3>{title}</H3>
        {description ? (
          <Text className="mt-1" variant="bodySmall">
            {description}
          </Text>
        ) : null}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <Muted className="mt-1.5">
          Question {currentIndex + 1} of {questions.length}
        </Muted>
      </div>

      <div className="p-6">
        <PreviewQuestion
          answer={answers.get(currentQuestion._id)}
          onAnswer={(val) => {
            const next = new Map(answers);
            next.set(currentQuestion._id, val);
            setAnswers(next);
          }}
          question={currentQuestion}
        />
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 p-4">
        <Button
          disabled={isFirst}
          onClick={() => setCurrentIndex((i) => i - 1)}
          size="sm"
          variant="outline"
        >
          Back
        </Button>
        <Button
          onClick={() => {
            if (isLast) {
              setCurrentIndex(0);
              setAnswers(new Map());
            } else {
              setCurrentIndex((i) => i + 1);
            }
          }}
          size="sm"
        >
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
}

interface PreviewQuestionProps {
  answer: unknown;
  onAnswer: (value: unknown) => void;
  question: SurveyQuestion;
}

function PreviewQuestion({ question, answer, onAnswer }: PreviewQuestionProps) {
  const Icon = ICON_MAP[question.type];

  return (
    <div>
      <div className="mb-4 flex items-start gap-2">
        <Icon className="mt-0.5 size-5 text-muted-foreground" />
        <div>
          <p className="font-medium">
            {question.title}
            {question.required ? (
              <span className="ml-1 text-destructive">*</span>
            ) : null}
          </p>
          {question.description ? (
            <p className="mt-0.5 text-muted-foreground text-sm">
              {question.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="ml-7">
        <QuestionInput
          answer={answer}
          config={question.config}
          onAnswer={onAnswer}
          type={question.type}
        />
      </div>
    </div>
  );
}

interface QuestionInputProps {
  answer: unknown;
  config?: SurveyQuestion["config"];
  onAnswer: (value: unknown) => void;
  type: QuestionType;
}

const QUESTION_INPUT_COMPONENTS: Record<
  QuestionType,
  (props: Omit<QuestionInputProps, "type">) => React.ReactNode
> = {
  rating: RatingInput,
  nps: NpsInput,
  text: TextInput,
  single_choice: SingleChoiceInput,
  multiple_choice: MultipleChoiceInput,
  boolean: BooleanInput,
};

function QuestionInput({ type, ...rest }: QuestionInputProps) {
  const Component = QUESTION_INPUT_COMPONENTS[type];
  return Component ? Component(rest) : null;
}

function RatingInput({
  config,
  answer,
  onAnswer,
}: Omit<QuestionInputProps, "type">) {
  const min = config?.minValue ?? 1;
  const max = config?.maxValue ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex gap-2">
        {values.map((val) => (
          <button
            className={cn(
              "flex size-10 items-center justify-center rounded-lg border text-sm transition-colors",
              answer === val
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-foreground/30"
            )}
            key={val}
            onClick={() => onAnswer(val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-muted-foreground text-xs">
        <span>{config?.minLabel}</span>
        <span>{config?.maxLabel}</span>
      </div>
    </div>
  );
}

function NpsInput({
  config,
  answer,
  onAnswer,
}: Omit<QuestionInputProps, "type">) {
  const values = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div>
      <div className="flex gap-1">
        {values.map((val) => (
          <button
            className={cn(
              "flex size-9 items-center justify-center rounded border text-sm transition-colors",
              answer === val &&
                "border-primary bg-primary text-primary-foreground",
              answer !== val &&
                val <= 6 &&
                "hover:bg-red-50 dark:hover:bg-red-950",
              answer !== val &&
                val > 6 &&
                val <= 8 &&
                "hover:bg-yellow-50 dark:hover:bg-yellow-950",
              answer !== val &&
                val > 8 &&
                "hover:bg-green-50 dark:hover:bg-green-950"
            )}
            key={val}
            onClick={() => onAnswer(val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-muted-foreground text-xs">
        <span>{config?.minLabel ?? "Not at all likely"}</span>
        <span>{config?.maxLabel ?? "Extremely likely"}</span>
      </div>
    </div>
  );
}

function TextInput({
  config,
  answer,
  onAnswer,
}: Omit<QuestionInputProps, "type">) {
  return (
    <Textarea
      maxLength={config?.maxLength}
      onChange={(e) => onAnswer(e.target.value)}
      placeholder={config?.placeholder ?? "Your answer..."}
      rows={3}
      value={typeof answer === "string" ? answer : ""}
    />
  );
}

function SingleChoiceInput({
  config,
  answer,
  onAnswer,
}: Omit<QuestionInputProps, "type">) {
  const choices = config?.choices ?? [];
  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => (
        <button
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
            answer === choice
              ? "border-primary bg-primary/5"
              : "hover:border-foreground/30"
          )}
          key={choice}
          onClick={() => onAnswer(choice)}
          type="button"
        >
          <div
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              answer === choice
                ? "border-primary bg-primary"
                : "border-muted-foreground"
            )}
          >
            {answer === choice ? (
              <div className="size-2 rounded-full bg-white" />
            ) : null}
          </div>
          {choice}
        </button>
      ))}
    </div>
  );
}

function MultipleChoiceInput({
  config,
  answer,
  onAnswer,
}: Omit<QuestionInputProps, "type">) {
  const choices = config?.choices ?? [];
  const selected = Array.isArray(answer) ? (answer as string[]) : [];

  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => {
        const isSelected = selected.includes(choice);
        return (
          <button
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "hover:border-foreground/30"
            )}
            key={choice}
            onClick={() => {
              const next = isSelected
                ? selected.filter((s) => s !== choice)
                : [...selected, choice];
              onAnswer(next);
            }}
            type="button"
          >
            <div
              className={cn(
                "flex size-4 items-center justify-center rounded border",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-muted-foreground"
              )}
            >
              {isSelected ? (
                <svg
                  aria-hidden="true"
                  className="size-3"
                  fill="none"
                  role="img"
                  viewBox="0 0 12 12"
                >
                  <title>Selected</title>
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              ) : null}
            </div>
            {choice}
          </button>
        );
      })}
    </div>
  );
}

function BooleanInput({ answer, onAnswer }: Omit<QuestionInputProps, "type">) {
  return (
    <div className="flex gap-3">
      <button
        className={cn(
          "flex-1 rounded-lg border p-4 text-center transition-colors",
          answer === true
            ? "border-primary bg-primary/5"
            : "hover:border-foreground/30"
        )}
        onClick={() => onAnswer(true)}
        type="button"
      >
        Yes
      </button>
      <button
        className={cn(
          "flex-1 rounded-lg border p-4 text-center transition-colors",
          answer === false
            ? "border-primary bg-primary/5"
            : "hover:border-foreground/30"
        )}
        onClick={() => onAnswer(false)}
        type="button"
      >
        No
      </button>
    </div>
  );
}
