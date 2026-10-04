"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ctrl-ui/react/ui/sheet";
import { X } from "@phosphor-icons/react";
import { NPS_MAX, ratingRange } from "@reflet/survey-core";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { formatDuration } from "@/features/surveys/components/analytics/analytics-summary";
import {
  type ResponseRow,
  respondentDisplayName,
  type SurveyQuestionDetail,
} from "@/features/surveys/components/responses/response-types";
import {
  formatAnswerValue,
  RESPONSE_CHANNEL_LABELS,
  RESPONSE_STATUS_COLORS,
  RESPONSE_STATUS_LABELS,
} from "@/features/surveys/lib/response-labels";

type ResponseAnswer = ResponseRow["answers"][number];

interface ResponseDetailSheetProps {
  endingTitles: ReadonlyMap<string, string>;
  onOpenChange: (open: boolean) => void;
  questions: readonly SurveyQuestionDetail[];
  response: ResponseRow | null;
}

export function ResponseDetailSheet({
  endingTitles,
  onOpenChange,
  questions,
  response,
}: ResponseDetailSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={response !== null}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-140 md:max-w-140"
        side="right"
      >
        {response ? (
          <ResponseDetail
            endingTitles={endingTitles}
            questions={questions}
            response={response}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ResponseDetail({
  endingTitles,
  questions,
  response,
}: {
  endingTitles: ReadonlyMap<string, string>;
  questions: readonly SurveyQuestionDetail[];
  response: ResponseRow;
}) {
  const { respondent } = response;
  const questionsById = new Map(
    questions.map((question) => [question._id, question])
  );
  const orderOf = (answer: ResponseAnswer) =>
    questionsById.get(answer.questionId)?.order ?? Number.POSITIVE_INFINITY;
  const orderedAnswers = [...response.answers].sort(
    (a, b) => orderOf(a) - orderOf(b)
  );
  const secondaryIdentity = respondent.name ? respondent.email : undefined;

  return (
    <>
      <SheetHeader className="flex shrink-0 flex-row items-start justify-between gap-2 border-b px-5 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <SheetTitle className="truncate">
            {respondentDisplayName(respondent)}
          </SheetTitle>
          <SheetDescription className="truncate">
            {secondaryIdentity ??
              `Response from ${format(response.startedAt, "PPP")}`}
          </SheetDescription>
        </div>
        <SheetClose
          render={
            <Button aria-label="Close" iconOnly size="xs" variant="ghost" />
          }
        >
          <X aria-hidden className="size-4" />
        </SheetClose>
      </SheetHeader>

      <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
          <DetailRow label="Status">
            <Badge color={RESPONSE_STATUS_COLORS[response.status]} size="sm">
              {RESPONSE_STATUS_LABELS[response.status]}
            </Badge>
          </DetailRow>
          <DetailRow label="Channel">
            {RESPONSE_CHANNEL_LABELS[response.channel]}
          </DetailRow>
          {response.endingId === undefined ? null : (
            <DetailRow label="Ending">
              {endingTitles.get(response.endingId) ?? response.endingId}
            </DetailRow>
          )}
          <DetailRow label="Started">
            {format(response.startedAt, "PPPp")}
          </DetailRow>
          {response.completedAt === undefined ? null : (
            <DetailRow label="Completed">
              {format(response.completedAt, "PPPp")}{" "}
              <span className="text-muted-foreground tabular-nums">
                ({formatDuration(response.completedAt - response.startedAt)})
              </span>
            </DetailRow>
          )}
          {response.pageUrl ? (
            <DetailRow label="Page">
              <span className="break-all">{response.pageUrl}</span>
            </DetailRow>
          ) : null}
          {respondent.id ? (
            <DetailRow label="Respondent ID">
              <span className="break-all font-mono text-xs">
                {respondent.id}
              </span>
            </DetailRow>
          ) : null}
        </dl>

        <section
          aria-labelledby="response-answers-heading"
          className="flex flex-col gap-3"
        >
          <h3 className="font-medium" id="response-answers-heading">
            Answers
          </h3>
          {orderedAnswers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This person didn’t answer any question.
            </p>
          ) : (
            <ol className="flex flex-col divide-y rounded-xl border">
              {orderedAnswers.map((answer) => (
                <li
                  className="flex flex-col gap-1.5 px-4 py-3"
                  key={answer.questionId}
                >
                  <span className="text-muted-foreground text-xs">
                    {answer.questionTitle}
                  </span>
                  <AnswerValueDisplay
                    answer={answer}
                    question={questionsById.get(answer.questionId)}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function DetailRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function AnswerValueDisplay({
  answer,
  question,
}: {
  answer: ResponseAnswer;
  question: SurveyQuestionDetail | undefined;
}) {
  const { value } = answer;
  if (Array.isArray(value)) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {value.map((choice) => (
          <li key={choice}>
            <Badge color="neutral" size="sm">
              {choice}
            </Badge>
          </li>
        ))}
      </ul>
    );
  }
  const isScaleAnswer =
    answer.questionType === "rating" || answer.questionType === "nps";
  if (isScaleAnswer && typeof value === "number") {
    const scaleMax =
      answer.questionType === "nps"
        ? NPS_MAX
        : ratingRange(question?.config).max;
    return (
      <p className="text-sm tabular-nums">
        <span className="font-semibold text-lg">{value}</span>
        <span className="text-muted-foreground"> / {scaleMax}</span>
      </p>
    );
  }
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {formatAnswerValue(value)}
    </p>
  );
}
