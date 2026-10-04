import type { AnswerValue, SurveyQuestion } from "@reflet/survey-core";
import type { RefObject } from "react";
import type { SurveySessionHandle } from "../use-survey-session";
import { QuestionBody } from "./question-body";
import {
  ActionButton,
  DEFAULT_BUTTON_LABEL,
  StepHeading,
} from "./survey-steps";

export function QuestionStep({
  headingId,
  headingRef,
  onPick,
  question,
  session,
}: {
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onPick: (value: AnswerValue) => void;
  question: SurveyQuestion;
  session: SurveySessionHandle;
}) {
  const { snapshot } = session;
  const isStatement = question.type === "statement";
  const nextLabel = snapshot.isLastStep ? "Submit" : "Next";

  return (
    <div className="rfs-step">
      <StepHeading
        description={question.description}
        headingId={headingId}
        headingRef={headingRef}
        title={question.title}
      />
      <QuestionBody
        labelledBy={headingId}
        onChange={session.setAnswer}
        onPick={onPick}
        question={question}
        value={snapshot.answers.get(question._id)}
      />
      {snapshot.error && (
        <p className="rfs-error" role="alert">
          {snapshot.error}
        </p>
      )}
      <div className="rfs-footer">
        {snapshot.canGoBack && (
          <button
            className="rfs-button"
            data-tone="ghost"
            disabled={snapshot.isSubmitting}
            onClick={session.back}
            type="button"
          >
            Back
          </button>
        )}
        <ActionButton
          disabled={snapshot.isSubmitting}
          onClick={() => session.next()}
          url={isStatement ? question.config?.buttonUrl : undefined}
        >
          {isStatement
            ? (question.config?.buttonLabel ?? DEFAULT_BUTTON_LABEL)
            : nextLabel}
        </ActionButton>
      </div>
    </div>
  );
}
