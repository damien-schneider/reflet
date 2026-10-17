import { useState } from "react";
import { PencilIcon } from "../../../../feedback/ui/icons";
import type { SessionSegment } from "../../../protocol";
import { formatClock } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { SaveProblemMessage, useGuardedSave } from "../guarded-save";
import { type ReviewHandle, withSegment } from "../use-session-detail";

function SaveCancelActions({
  isSaveDisabled,
  onCancel,
  onSave,
}: {
  isSaveDisabled: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={isSaveDisabled}
        onClick={onSave}
        type="button"
      >
        Save
      </button>
      <button className="dt-btn" onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}

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
    <div className="dt-ses-form">
      <textarea
        aria-label={`Passage at ${formatClock(segment.startMs)}`}
        className="dt-field"
        maxLength={5000}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        value={text}
      />
      {problem && (
        <SaveProblemMessage onReload={review.reload} problem={problem} />
      )}
      <SaveCancelActions
        isSaveDisabled={isSaving || text.trim() === ""}
        onCancel={onDone}
        onSave={submit}
      />
    </div>
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
  return <p className="dt-note-text">{segment.text}</p>;
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
      className="dt-ses-time dt-ses-open"
      onClick={(event) => onShowMoment(event.currentTarget)}
      type="button"
    >
      {time}
    </button>
  );
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

  return (
    <li className="dt-ses-seg dt-ses-openable">
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
        <button
          aria-label={`Edit passage at ${time}`}
          className="icon-btn glass dt-ses-hover-action"
          onClick={() => setIsEditing(true)}
          title="Edit"
          type="button"
        >
          <PencilIcon />
        </button>
      )}
    </li>
  );
}
