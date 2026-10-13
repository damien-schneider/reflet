import { useEffect, useState } from "react";
import { announce } from "../../../../devtools/client/notices";
import type {
  ContextChoice,
  ContextOption,
  SessionSegment,
} from "../../../protocol";
import {
  failureMessage,
  isUnauthorized,
  useSessionWorkspace,
} from "../../session-workspace";
import { SaveProblemMessage, useGuardedSave } from "../guarded-save";
import { FormActions } from "../proposals/proposal-editor";
import { useFocusWhen } from "../transcript/remove-evidence";
import { type ReviewHandle, withSegment } from "../use-session-detail";
import { contextKindLabel, offsetFromPassage } from "./moment-labels";

const AUTO_CHOICE: ContextChoice = { kind: "auto" };
const UNKNOWN_CHOICE: ContextChoice = { kind: "unknown" };

type ChoicesState =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "ready"; options: ContextOption[] };

function useContextChoices(segmentId: string) {
  const { api, onUnauthorized } = useSessionWorkspace();
  const [state, setState] = useState<ChoicesState>({ kind: "loading" });

  useEffect(() => {
    let isCurrent = true;
    api.contextChoices(segmentId).then(
      (options) => isCurrent && setState({ kind: "ready", options }),
      (error: unknown) => {
        if (isUnauthorized(error)) {
          onUnauthorized();
        } else if (isCurrent) {
          setState({ kind: "failed", message: failureMessage(error) });
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [api, onUnauthorized, segmentId]);

  return state;
}

interface ChoiceGroup {
  chosen: ContextChoice | null;
  name: string;
  onPick: (choice: ContextChoice) => void;
}

interface Correction {
  onDone: () => void;
  review: ReviewHandle;
  segment: SessionSegment;
}

function ChoiceRadio({
  choice,
  group,
  label,
}: {
  choice: ContextChoice;
  group: ChoiceGroup;
  label: string;
}) {
  return (
    <li>
      <label className="dt-ses-check">
        <input
          checked={group.chosen === choice}
          name={group.name}
          onChange={() => group.onPick(choice)}
          type="radio"
        />
        <span>{label}</span>
      </label>
    </li>
  );
}

function optionLabel(option: ContextOption, segment: SessionSegment): string {
  const { item } = option;
  const element = item.element?.label ?? item.label;
  return `${contextKindLabel(item)} · ${element} · ${offsetFromPassage(item.atMs, segment)}`;
}

function ChoicesFieldset({
  group,
  options,
  segment,
}: {
  group: ChoiceGroup;
  options: ContextOption[];
  segment: SessionSegment;
}) {
  return (
    <fieldset className="dt-ses-choices">
      <legend className="dt-ses-label">What this passage is about</legend>
      <ul className="dt-ses-list">
        {options.map((option) => (
          <ChoiceRadio
            choice={option.choice}
            group={group}
            key={JSON.stringify(option.choice)}
            label={optionLabel(option, segment)}
          />
        ))}
        <ChoiceRadio
          choice={UNKNOWN_CHOICE}
          group={group}
          label="Context unknown"
        />
        {segment.contextOrigin !== "auto" && (
          <ChoiceRadio
            choice={AUTO_CHOICE}
            group={group}
            label="Back to automatic"
          />
        )}
      </ul>
    </fieldset>
  );
}

function useSaveContext(correction: Correction, chosen: ContextChoice | null) {
  const { onDone, review, segment } = correction;
  const { api } = useSessionWorkspace();
  const { isSaving, problem, save } = useGuardedSave();
  const submit = () =>
    save(async () => {
      if (!chosen) {
        return;
      }
      const saved = await api.setSegmentContext({
        choice: chosen,
        expectedRevision: segment.revision,
        segmentId: segment.id,
      });
      review.patch((detail) => withSegment(detail, saved));
      announce("Context corrected");
      onDone();
    });
  return { isSaving, problem, submit };
}

function ChoicesForm({
  correction,
  options,
}: {
  correction: Correction;
  options: ContextOption[];
}) {
  const { onDone, review, segment } = correction;
  const [picked, setPicked] = useState<ContextChoice | null>(null);
  const current =
    options.find((option) => option.selected)?.choice ??
    (segment.contextOrigin === "unknown" ? UNKNOWN_CHOICE : null);
  const chosen = picked ?? current;
  const { isSaving, problem, submit } = useSaveContext(correction, chosen);

  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ChoicesFieldset
        group={{ chosen, name: `rf-context-${segment.id}`, onPick: setPicked }}
        options={options}
        segment={segment}
      />
      {problem && (
        <SaveProblemMessage onReload={review.reload} problem={problem} />
      )}
      <FormActions
        isSubmitDisabled={isSaving || picked === null}
        onCancel={onDone}
        submitLabel="Save context"
      />
    </form>
  );
}

function ContextChoices({
  correction,
  onRetry,
}: {
  correction: Correction;
  onRetry: () => void;
}) {
  const state = useContextChoices(correction.segment.id);
  if (state.kind === "loading") {
    return <p className="dt-status">Loading what was happening…</p>;
  }
  if (state.kind === "failed") {
    return (
      <div className="dt-actions" role="alert">
        <p className="dt-error">The choices did not load: {state.message}</p>
        <button className="dt-btn" onClick={onRetry} type="button">
          Try again
        </button>
        <button className="dt-btn" onClick={correction.onDone} type="button">
          Cancel
        </button>
      </div>
    );
  }
  return <ChoicesForm correction={correction} options={state.options} />;
}

export function ContextCorrection({
  review,
  segment,
}: {
  review: ReviewHandle;
  segment: SessionSegment;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const buttonRef = useFocusWhen<HTMLButtonElement>(hasClosed && !isOpen);
  if (isOpen) {
    return (
      <ContextChoices
        correction={{
          onDone: () => {
            setIsOpen(false);
            setHasClosed(true);
          },
          review,
          segment,
        }}
        key={attempt}
        onRetry={() => setAttempt(attempt + 1)}
      />
    );
  }
  return (
    <button
      className="dt-btn"
      onClick={() => {
        setIsOpen(true);
        setHasClosed(false);
      }}
      ref={buttonRef}
      type="button"
    >
      Change context
    </button>
  );
}
