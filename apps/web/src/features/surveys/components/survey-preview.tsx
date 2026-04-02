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
import { H3, Muted, Text } from "@/components/ui/typography";
import { QuestionInput } from "@/features/surveys/components/survey-question-inputs";
import type { SurveyQuestion } from "@/store/surveys";

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
