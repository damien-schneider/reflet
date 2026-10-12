import { type RefObject, useEffect, useRef, useState } from "react";
import { matchesHotkey } from "../../../feedback/ui/keyboard";
import { listenToKeydown } from "../../../feedback/ui/widget-events";
import { useSyncStatus } from "../../local/local-sessions";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../recorder/session-recorder";
import { formatClock, minutesLeft, spokenDuration } from "../session-format";
import { MarkIcon, PauseIcon, PlayIcon } from "../session-icons";
import { useSessionWorkspace } from "../session-workspace";
import { LevelMeter } from "./level-meter";
import { MarkNote } from "./mark-note";

const MARK_HOTKEY = "alt+shift+m";

function SyncChip() {
  const { account } = useSessionWorkspace();
  const sync = useSyncStatus(account.key);
  let label = "Saved";
  if (sync.blockedBy === "storage") {
    label = "Not saved on this device";
  } else if (!sync.isOnline) {
    label = "Offline — kept on this device";
  } else if (sync.pendingOperations > 0) {
    label = `${sync.pendingOperations} waiting to upload`;
  }
  return <span className="dt-chip">{label}</span>;
}

function statusText(snapshot: RecorderSnapshot, maxDurationMs: number) {
  if (snapshot.phase === "failed") {
    return snapshot.failure?.message ?? "Recording stopped.";
  }
  if (snapshot.phase === "finishing") {
    return "Finishing…";
  }
  if (snapshot.pauseReason === "limit") {
    return "Time limit reached · Finish to review the session";
  }
  if (snapshot.pauseReason === "hidden") {
    return "Paused because the tab was hidden";
  }
  if (snapshot.phase === "paused") {
    return "Paused · nothing is recorded";
  }
  if (snapshot.limitsReached.length > 0) {
    return `Limit reached for ${snapshot.limitsReached.join(", ")}`;
  }
  return snapshot.nearLimit
    ? `${minutesLeft(maxDurationMs - snapshot.activeMs)} min left`
    : "";
}

interface OpenMark {
  closeNote: (note: string) => void;
  focus: boolean;
  key: string;
}

// closeNote is created with the mark so MarkNote's untouched-timer effect keeps a stable onClose.
function markMoment(
  recorder: SessionRecorder,
  focus: boolean,
  setOpenMark: (mark: OpenMark | null) => void
) {
  const key = recorder.mark();
  setOpenMark({
    closeNote: (note: string) => {
      recorder.annotateMark(key, note);
      setOpenMark(null);
    },
    focus,
    key,
  });
}

function useMarkMoment(
  snapshot: RecorderSnapshot,
  barRef: RefObject<HTMLDivElement | null>
) {
  const { recorder } = useSessionWorkspace();
  const [openMark, setOpenMark] = useState<OpenMark | null>(null);
  const canMark = snapshot.phase === "recording";

  useEffect(
    () =>
      listenToKeydown(barRef.current, (event) => {
        if (canMark && matchesHotkey(event, MARK_HOTKEY)) {
          event.preventDefault();
          markMoment(recorder, false, setOpenMark);
        }
      }),
    [barRef, canMark, recorder]
  );
  return {
    markWithNote: () => markMoment(recorder, true, setOpenMark),
    openMark,
  };
}

function CaptureButtons({
  canCapture,
  onMark,
  onPointAt,
}: {
  canCapture: boolean;
  onMark: () => void;
  onPointAt: () => void;
}) {
  return (
    <>
      <button
        aria-keyshortcuts="Alt+Shift+M"
        className="dt-btn"
        disabled={!canCapture}
        onClick={onMark}
        title="Mark moment (Alt+Shift+M)"
        type="button"
      >
        <MarkIcon />
        Mark moment
      </button>
      <button
        className="dt-btn"
        disabled={!canCapture}
        onClick={onPointAt}
        type="button"
      >
        Point at element
      </button>
    </>
  );
}

function PauseToggle({ snapshot }: { snapshot: RecorderSnapshot }) {
  const { recorder } = useSessionWorkspace();
  if (snapshot.phase === "recording") {
    return (
      <button
        className="dt-btn"
        onClick={() => recorder.pause("paused")}
        type="button"
      >
        <PauseIcon />
        Pause
      </button>
    );
  }
  if (snapshot.phase === "paused" && snapshot.pauseReason !== "limit") {
    return (
      <button
        className="dt-btn"
        onClick={() => recorder.resume()}
        type="button"
      >
        <PlayIcon />
        Resume
      </button>
    );
  }
  return null;
}

function RecordingControls({
  onFinish,
  onMark,
  onPointAt,
  snapshot,
}: {
  onFinish: () => void;
  onMark: () => void;
  onPointAt: () => void;
  snapshot: RecorderSnapshot;
}) {
  const { phase } = snapshot;
  const isActive = phase === "recording" || phase === "paused";
  return (
    <>
      {isActive && (
        <CaptureButtons
          canCapture={phase === "recording"}
          onMark={onMark}
          onPointAt={onPointAt}
        />
      )}
      <PauseToggle snapshot={snapshot} />
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={phase === "finishing"}
        onClick={onFinish}
        type="button"
      >
        Finish
      </button>
    </>
  );
}

function RecordingClock({ activeMs }: { activeMs: number }) {
  return (
    <span
      aria-label={`Recording, ${spokenDuration(activeMs)}`}
      aria-live="off"
      className="dt-rec-time"
      role="timer"
    >
      {formatClock(activeMs)}
    </span>
  );
}

export function RecordingBar({
  onFinish,
  onPointAt,
  snapshot,
}: {
  onFinish: () => void;
  onPointAt: () => void;
  snapshot: RecorderSnapshot;
}) {
  const { identity, recorder } = useSessionWorkspace();
  const barRef = useRef<HTMLDivElement>(null);
  const { markWithNote, openMark } = useMarkMoment(snapshot, barRef);

  return (
    <div
      aria-label="Session recording"
      className="dt-rec glass"
      data-phase={snapshot.phase}
      ref={barRef}
      role="toolbar"
    >
      <span aria-hidden="true" className="dt-rec-dot" />
      {snapshot.phase === "recording" && <LevelMeter recorder={recorder} />}
      <RecordingClock activeMs={snapshot.activeMs} />
      <span aria-live="polite" className="dt-rec-status">
        {statusText(snapshot, identity.limits.maxDurationMs)}
      </span>
      <RecordingControls
        onFinish={onFinish}
        onMark={markWithNote}
        onPointAt={onPointAt}
        snapshot={snapshot}
      />
      <SyncChip />
      {openMark && (
        <MarkNote
          focusOnOpen={openMark.focus}
          key={openMark.key}
          onClose={openMark.closeNote}
        />
      )}
    </div>
  );
}
