import { type MouseEvent, useRef, useState } from "react";
import { PencilIcon } from "../../../../feedback/ui/icons";
import type { SessionSegment, SpokenRun } from "../../../protocol";
import { formatClock, speakerLabel } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { submitOnModEnter } from "../../submit-shortcut";
import { SaveProblemMessage, useGuardedSave } from "../guarded-save";
import { FormActions } from "../proposals/proposal-editor";
import { type ReviewHandle, withSegment } from "../use-session-detail";

function SegmentEditor({
  onDone,
  review,
  segment,
}: {
  onDone: () => void;
  review: ReviewHandle;
  segment: SessionSegment;
}) {
  const { api } = useSessionWorkspace();
  const { isSaving, problem, save } = useGuardedSave();
  const [text, setText] = useState(segment.text);
  const submit = () =>
    save(async () => {
      const saved = await api.correctSegment({
        expectedRevision: segment.revision,
        segmentId: segment.id,
        text: text.trim(),
      });
      review.patch((detail) => withSegment(detail, saved));
      review.reload();
      onDone();
    });

  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label={`Passage at ${formatClock(segment.startMs)}`}
        className="dt-field"
        maxLength={5000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={submitOnModEnter}
        rows={3}
        value={text}
      />
      {problem && (
        <SaveProblemMessage onReload={review.reload} problem={problem} />
      )}
      <FormActions
        isSubmitDisabled={isSaving || text.trim() === ""}
        onCancel={onDone}
        submitLabel="Save"
      />
    </form>
  );
}

function SegmentBody({
  onType,
  review,
  segment,
}: {
  onType?: () => void;
  review: ReviewHandle;
  segment: SessionSegment;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const { state } = segment.transcription;
  const retry = async () => {
    const pending = await run("The transcription did not restart", () =>
      api.retrySegment(segment.id)
    );
    if (pending) {
      review.patch((detail) => withSegment(detail, pending));
    }
  };

  if (state === "pending" || state === "running") {
    return <p className="dt-status">Transcribing…</p>;
  }
  if (state === "failed" || state === "expired") {
    return (
      <div className="dt-actions">
        <p className="dt-error">
          {state === "failed"
            ? "Couldn't transcribe"
            : "Audio expired — type what you said"}
        </p>
        {onType && state === "failed" && segment.hasAudio && (
          <button className="dt-btn" onClick={retry} type="button">
            Retry
          </button>
        )}
        {onType && (
          <button className="dt-btn" onClick={onType} type="button">
            Type it
          </button>
        )}
      </div>
    );
  }
  if (state === "empty" && segment.text === "") {
    return <p className="dt-meta">No speech was heard here.</p>;
  }
  if (segment.speech) {
    return <SpokenRuns speech={segment.speech} />;
  }
  return <p className="dt-note-text">{segment.text}</p>;
}

function SpokenRuns({ speech }: { speech: SpokenRun[] }) {
  let startsAt = 0;
  const lines = speech.map((run) => {
    const line = { ...run, startsAt };
    startsAt += run.text.length;
    return line;
  });
  return (
    <>
      {lines.map((line) => (
        <p className="dt-note-text" key={line.startsAt}>
          {line.speaker && (
            <>
              <span className="dt-ses-speaker">
                {speakerLabel(line.speaker)}
              </span>{" "}
            </>
          )}
          {line.text}
        </p>
      ))}
    </>
  );
}

function ContextChips({ segment }: { segment: SessionSegment }) {
  if (segment.context.length === 0) {
    return null;
  }
  return (
    <div className="dt-ses-chips">
      {segment.contextAmbiguous && (
        <span className="dt-chip">Unclear which element</span>
      )}
      {segment.context.map((item) => (
        <span
          className="dt-chip"
          key={`${item.kind}:${item.atMs}:${item.label}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function MomentTime({
  onShowMoment,
  time,
}: {
  onShowMoment: ((opener: HTMLElement) => void) | null;
  time: string;
}) {
  if (!onShowMoment) {
    return <span className="dt-ses-time">{time}</span>;
  }
  return (
    <button
      aria-label={`Show the moment at ${time}`}
      className="dt-ses-time dt-open"
      onClick={(event) => onShowMoment(event.currentTarget)}
      type="button"
    >
      {time}
    </button>
  );
}

const TEXT_DRAG_THRESHOLD_PX = 4;

export function useOpenMomentOnRowClick() {
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  return {
    onClick(event: MouseEvent<HTMLElement>) {
      const start = pressedAt.current;
      const isTextDrag =
        start !== null &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          TEXT_DRAG_THRESHOLD_PX;
      const isOnControl =
        event.target instanceof Element &&
        event.target.closest("a, button, input, select, textarea") !== null;
      if (isTextDrag || isOnControl) {
        return;
      }
      event.currentTarget
        .querySelector<HTMLButtonElement>(":scope > .dt-open")
        ?.click();
    },
    onMouseDown(event: MouseEvent<HTMLElement>) {
      pressedAt.current = { x: event.clientX, y: event.clientY };
    },
  };
}

export interface SegmentEditing {
  canEdit: boolean;
  review: ReviewHandle;
}

export function SegmentRow({
  editing,
  onShowMoment,
  segment,
}: {
  editing: SegmentEditing;
  onShowMoment: (opener: HTMLElement) => void;
  segment: SessionSegment;
}) {
  const { canEdit, review } = editing;
  const [isEditing, setIsEditing] = useState(false);
  const time = formatClock(segment.startMs);
  const isSettled = ["done", "empty"].includes(segment.transcription.state);
  const canStartEditing = canEdit && isSettled && !isEditing;
  const rowClick = useOpenMomentOnRowClick();

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: pointer shortcut; the time button is the keyboard path
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer shortcut; the time button is the keyboard path
    <li
      className="dt-ses-seg dt-openable"
      onClick={rowClick.onClick}
      onMouseDown={rowClick.onMouseDown}
    >
      <MomentTime onShowMoment={isEditing ? null : onShowMoment} time={time} />
      <div className="dt-ses-seg-body">
        {isEditing ? (
          <SegmentEditor
            onDone={() => setIsEditing(false)}
            review={review}
            segment={segment}
          />
        ) : (
          <SegmentBody
            onType={canEdit ? () => setIsEditing(true) : undefined}
            review={review}
            segment={segment}
          />
        )}
        <ContextChips segment={segment} />
      </div>
      {canStartEditing && (
        <div className="dt-hover-actions">
          <button
            aria-label={`Edit passage at ${time}`}
            className="icon-btn glass"
            onClick={() => setIsEditing(true)}
            title="Edit"
            type="button"
          >
            <PencilIcon />
          </button>
        </div>
      )}
    </li>
  );
}
