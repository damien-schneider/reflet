import {
  type AnswerValue,
  type SurveyQuestion,
  textMaxChars,
} from "@reflet/survey-core";
import {
  BooleanField,
  MultipleChoiceField,
  SingleChoiceField,
} from "./choice-fields";
import { NpsField, RatingField } from "./scale-fields";

interface QuestionBodyProps {
  labelledBy: string;
  onChange: (value: AnswerValue | undefined) => void;
  /** Answer and move on: single-click questions don't need a Next press. */
  onPick: (value: AnswerValue) => void;
  question: SurveyQuestion;
  value: AnswerValue | undefined;
}

function TextField({
  labelledBy,
  onChange,
  question,
  value,
}: Omit<QuestionBodyProps, "onPick">) {
  const max = textMaxChars(question.config);
  const text = typeof value === "string" ? value : "";
  return (
    <div className="rfs-input-wrap">
      <textarea
        aria-labelledby={labelledBy}
        className="rfs-input"
        maxLength={max}
        onChange={(event) => onChange(event.target.value || undefined)}
        placeholder={question.config?.placeholder ?? "Type your answer…"}
        rows={3}
        value={text}
      />
      <span className="rfs-counter" data-full={text.length >= max}>
        {text.length}/{max}
      </span>
    </div>
  );
}

export function QuestionBody(props: QuestionBodyProps) {
  const { labelledBy, onPick, question, value } = props;
  const numericValue = typeof value === "number" ? value : undefined;
  switch (question.type) {
    case "rating":
      return (
        <RatingField
          labelledBy={labelledBy}
          onPick={onPick}
          question={question}
          value={numericValue}
        />
      );
    case "nps":
      return (
        <NpsField
          labelledBy={labelledBy}
          onPick={onPick}
          question={question}
          value={numericValue}
        />
      );
    case "single_choice":
      return <SingleChoiceField {...props} />;
    case "multiple_choice":
      return <MultipleChoiceField {...props} />;
    case "boolean":
      return <BooleanField {...props} />;
    case "text":
      return <TextField {...props} />;
    default:
      return null;
  }
}
