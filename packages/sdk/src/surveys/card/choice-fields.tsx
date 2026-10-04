import {
  type AnswerValue,
  MAX_OTHER_CHOICE_CHARS,
  type SurveyQuestion,
} from "@reflet/survey-core";
import { useEffect, useRef, useState } from "react";

const OTHER_LABEL = "Other";

interface ChoiceFieldProps {
  labelledBy: string;
  onChange: (value: AnswerValue | undefined) => void;
  onPick: (value: AnswerValue) => void;
  question: SurveyQuestion;
  value: AnswerValue | undefined;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
      viewBox="0 0 24 24"
      width="10"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function ChoiceOption({
  checked,
  label,
  multiple,
  onSelect,
}: {
  checked: boolean;
  label: string;
  multiple: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="rfs-choice"
      onClick={onSelect}
      type="button"
    >
      <span
        className="rfs-indicator"
        data-shape={multiple ? "square" : "round"}
      >
        {checked && <CheckIcon />}
      </span>
      {label}
    </button>
  );
}

function OtherInput({
  onChange,
  value,
}: {
  onChange: (text: string) => void;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <input
      aria-label="Other answer"
      className="rfs-input"
      maxLength={MAX_OTHER_CHOICE_CHARS}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Type your answer…"
      ref={inputRef}
      type="text"
      value={value}
    />
  );
}

export function SingleChoiceField({
  labelledBy,
  onChange,
  onPick,
  question,
  value,
}: ChoiceFieldProps) {
  const choices = question.config?.choices ?? [];
  const typedOther =
    typeof value === "string" && !choices.includes(value) ? value : "";
  const [otherOpen, setOtherOpen] = useState(typedOther !== "");

  return (
    <fieldset aria-labelledby={labelledBy} className="rfs-choices">
      {choices.map((choice) => (
        <ChoiceOption
          checked={!otherOpen && value === choice}
          key={choice}
          label={choice}
          multiple={false}
          onSelect={() => {
            setOtherOpen(false);
            onPick(choice);
          }}
        />
      ))}
      {question.config?.allowOther && (
        <ChoiceOption
          checked={otherOpen}
          label={OTHER_LABEL}
          multiple={false}
          onSelect={() => {
            setOtherOpen(true);
            onChange(typedOther || undefined);
          }}
        />
      )}
      {otherOpen && (
        <OtherInput
          onChange={(text) => onChange(text || undefined)}
          value={typedOther}
        />
      )}
    </fieldset>
  );
}

export function MultipleChoiceField({
  labelledBy,
  onChange,
  question,
  value,
}: Omit<ChoiceFieldProps, "onPick">) {
  const choices = question.config?.choices ?? [];
  const picked = Array.isArray(value) ? value : [];
  const listed = picked.filter((choice) => choices.includes(choice));
  const typedOther = picked.find((choice) => !choices.includes(choice)) ?? "";
  const [otherOpen, setOtherOpen] = useState(typedOther !== "");

  const commit = (nextListed: string[], other: string) => {
    const next = other ? [...nextListed, other] : nextListed;
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <fieldset aria-labelledby={labelledBy} className="rfs-choices">
      {choices.map((choice) => {
        const checked = listed.includes(choice);
        return (
          <ChoiceOption
            checked={checked}
            key={choice}
            label={choice}
            multiple={true}
            onSelect={() =>
              commit(
                checked
                  ? listed.filter((item) => item !== choice)
                  : choices.filter(
                      (item) => item === choice || listed.includes(item)
                    ),
                typedOther
              )
            }
          />
        );
      })}
      {question.config?.allowOther && (
        <ChoiceOption
          checked={otherOpen}
          label={OTHER_LABEL}
          multiple={true}
          onSelect={() => {
            setOtherOpen(!otherOpen);
            commit(listed, otherOpen ? "" : typedOther);
          }}
        />
      )}
      {otherOpen && (
        <OtherInput
          onChange={(text) => commit(listed, text)}
          value={typedOther}
        />
      )}
    </fieldset>
  );
}

export function BooleanField({
  labelledBy,
  onPick,
  value,
}: Pick<ChoiceFieldProps, "labelledBy" | "onPick" | "value">) {
  return (
    <fieldset aria-labelledby={labelledBy} className="rfs-boolean">
      {[
        { answer: true, label: "Yes" },
        { answer: false, label: "No" },
      ].map(({ answer, label }) => (
        <button
          aria-pressed={value === answer}
          className="rfs-choice"
          key={label}
          onClick={() => onPick(answer)}
          type="button"
        >
          {label}
        </button>
      ))}
    </fieldset>
  );
}
