"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@ctrl-ui/react/ui/progress";
import { type ComponentType, useState } from "react";
import { H3, Text } from "@/components/ui/typography";
import { RequiredMark } from "@/features/surveys/components/required-mark";
import {
  BooleanInput,
  MultipleChoiceInput,
  NpsInput,
  type QuestionInputProps,
  RatingInput,
  SingleChoiceInput,
  TextInput,
} from "@/features/surveys/components/survey-preview-inputs";
import { QUESTION_TYPE_ICONS } from "@/features/surveys/lib/question-type-icons";
import type { QuestionType, SurveyQuestion } from "@/store/surveys";

const QUESTION_INPUTS: Record<
  QuestionType,
  ComponentType<QuestionInputProps>
> = {
  boolean: BooleanInput,
  multiple_choice: MultipleChoiceInput,
  nps: NpsInput,
  rating: RatingInput,
  single_choice: SingleChoiceInput,
  text: TextInput,
};

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
      <Empty className="rounded-lg border border-dashed py-12">
        <EmptyHeader>
          <EmptyTitle>Nothing to preview yet</EmptyTitle>
          <EmptyDescription>
            Questions you add appear here as respondents will see them.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const index = Math.min(currentIndex, questions.length - 1);
  const question = questions[index];
  const isLast = index === questions.length - 1;

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/30 p-4">
        <H3 className="text-pretty">{title}</H3>
        {description ? (
          <Text
            className="mt-1 text-pretty text-muted-foreground"
            variant="bodySmall"
          >
            {description}
          </Text>
        ) : null}
        <Progress
          aria-label="Survey progress"
          className="mt-3"
          max={questions.length}
          value={index + 1}
        >
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        <p
          aria-live="polite"
          className="mt-1.5 text-muted-foreground text-sm tabular-nums"
        >
          Question {index + 1} of {questions.length}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <PreviewQuestion
          answer={answers.get(question._id)}
          onAnswer={(value) => {
            const next = new Map(answers);
            next.set(question._id, value);
            setAnswers(next);
          }}
          question={question}
        />
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 p-4">
        <Button
          disabled={index === 0}
          onClick={() => setCurrentIndex(index - 1)}
          size="sm"
          variant="surface"
        >
          Back
        </Button>
        <Button
          onClick={() => {
            if (isLast) {
              setCurrentIndex(0);
              setAnswers(new Map());
              return;
            }
            setCurrentIndex(index + 1);
          }}
          size="sm"
          tone="primary"
          variant="solid"
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
  const Icon = QUESTION_TYPE_ICONS[question.type];
  const QuestionInput = QUESTION_INPUTS[question.type];

  return (
    <div>
      <div className="mb-4 flex items-start gap-2">
        <Icon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <p className="text-pretty font-medium">
            {question.title}
            {question.required ? <RequiredMark /> : null}
          </p>
          {question.description ? (
            <p className="mt-0.5 text-pretty text-muted-foreground text-sm">
              {question.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="sm:ml-7">
        <QuestionInput
          answer={answer}
          config={question.config}
          onAnswer={onAnswer}
        />
      </div>
    </div>
  );
}
