import { type ReactNode, useState } from "react";
import { copyToClipboard } from "../../../../devtools/client/clipboard";
import { announce, reportFailure } from "../../../../devtools/client/notices";
import type { SessionDetail } from "../../../protocol";
import { formatClock } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { submitOnModEnter } from "../../submit-shortcut";
import type { ShowMoment } from "../proposals/proposal-details";
import { type ReviewHandle, withSegment } from "../use-session-detail";
import { MomentTime, SegmentRow, useOpenMomentOnRowClick } from "./segment-row";
import { buildTimeline } from "./timeline";
import { transcriptForAgent } from "./transcript-export";

function TimelineNote({
  atMs,
  children,
  onShowMoment,
}: {
  atMs: number;
  children: ReactNode;
  onShowMoment: ((opener: HTMLElement) => void) | null;
}) {
  const rowClick = useOpenMomentOnRowClick();
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: pointer shortcut; the time button is the keyboard path
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer shortcut; the time button is the keyboard path
    <li
      className="dt-ses-seg dt-openable"
      data-kind="note"
      onClick={rowClick.onClick}
      onMouseDown={rowClick.onMouseDown}
    >
      <MomentTime onShowMoment={onShowMoment} time={formatClock(atMs)} />
      <div className="dt-ses-seg-body">
        <p className="dt-meta">{children}</p>
      </div>
    </li>
  );
}

interface TranscriptEditing {
  detail: SessionDetail;
  review: ReviewHandle;
}

function noteMomentOpener(
  segmentId: string | null,
  onShowMoment: ShowMoment
): ((opener: HTMLElement) => void) | null {
  if (!segmentId) {
    return null;
  }
  return (opener) => onShowMoment(segmentId, opener);
}

function useTypedPassage({ detail, review }: TranscriptEditing) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const [text, setText] = useState("");
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const atMs = detail.segments.at(-1)?.endMs ?? 0;

  const add = async () => {
    const segment = await run("The passage was not added", () =>
      api.addTypedSegment({
        clientKey,
        endMs: atMs,
        sessionId: detail.session.id,
        startMs: atMs,
        text: text.trim(),
      })
    );
    if (segment) {
      review.patch((current) => withSegment(current, segment));
      setText("");
      setClientKey(crypto.randomUUID());
    }
  };

  return { add, setText, text };
}

function AddTypedPassage({ detail, review }: TranscriptEditing) {
  const { add, setText, text } = useTypedPassage({ detail, review });
  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <textarea
        aria-label="Add a typed passage"
        className="dt-field"
        maxLength={5000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={submitOnModEnter}
        placeholder="Add a typed passage"
        rows={2}
        value={text}
      />
      <div className="dt-actions">
        <button className="dt-btn" disabled={text.trim() === ""} type="submit">
          Add passage
        </button>
      </div>
    </form>
  );
}

function copyTranscript(detail: SessionDetail) {
  copyToClipboard(Promise.resolve(transcriptForAgent(detail)))
    .then(() => announce("Transcript copied with its screenshot links"))
    .catch((error: unknown) =>
      reportFailure("The transcript was not copied", error)
    );
}

export function TranscriptTab({
  detail,
  onShowMoment,
  review,
}: {
  detail: SessionDetail;
  onShowMoment: ShowMoment;
  review: ReviewHandle;
}) {
  const { canEdit } = detail.session;
  const timeline = buildTimeline(detail);

  return (
    <>
      <p className="dt-hint">
        Audio is deleted once transcribed. You can still correct the text.
      </p>
      {timeline.length === 0 ? (
        <p className="dt-empty">Nothing was said in this session.</p>
      ) : (
        <div className="dt-actions">
          <button
            className="dt-btn"
            onClick={() => copyTranscript(detail)}
            type="button"
          >
            Copy transcript
          </button>
        </div>
      )}
      <ol className="dt-ses-timeline">
        {timeline.map((item) =>
          "segment" in item ? (
            <SegmentRow
              editing={{ canEdit, review }}
              key={item.key}
              onShowMoment={(opener) => onShowMoment(item.segment.id, opener)}
              segment={item.segment}
            />
          ) : (
            <TimelineNote
              atMs={item.atMs}
              key={item.key}
              onShowMoment={noteMomentOpener(item.segmentId, onShowMoment)}
            >
              {item.label}
            </TimelineNote>
          )
        )}
      </ol>
      {canEdit && <AddTypedPassage detail={detail} review={review} />}
    </>
  );
}
