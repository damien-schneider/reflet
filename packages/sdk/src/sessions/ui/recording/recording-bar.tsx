import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CloseIcon, TargetIcon } from "../../../feedback/ui/icons";
import { matchesHotkey } from "../../../feedback/ui/keyboard";
import { listenToKeydown } from "../../../feedback/ui/widget-events";
import { useSyncStatus } from "../../local/local-sessions";
import type { SyncSnapshot } from "../../local/session-store";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../recorder/session-recorder";
import { useFocusWhen } from "../review/transcript/remove-evidence";
import { formatClock, minutesLeft, spokenDuration } from "../session-format";
import {
  MarkIcon,
  PauseIcon,
  PlayIcon,
  TranscriptIcon,
} from "../session-icons";
import { useSessionWorkspace } from "../session-workspace";
import { CancelConfirmation } from "./cancel-confirmation";
import { LevelMeter } from "./level-meter";
import { MarkNote } from "./mark-note";

const MARK_HOTKEY = "alt+shift+m";

function syncProblem(sync: SyncSnapshot): string | null {
  if (sync.blockedBy === "storage") {
    return "Not saved on this device";
  }
  if (!sync.isOnline) {
    return "Offline — kept on this device";
  }
  return null;
}

function statusText(
  snapshot: RecorderSnapshot,
  sync: SyncSnapshot,
  maxDurationMs: number
) {
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
  if (snapshot.limitsReached.length > 0) {
    return `Limit reached for ${snapshot.limitsReached.join(", ")}`;
  }
  const problem = syncProblem(sync);
  if (problem) {
    return problem;
  }
  if (snapshot.nearLimit) {
    return `${minutesLeft(maxDurationMs - snapshot.activeMs)} min left`;
  }
  return snapshot.speakers === "unavailable"
    ? "Speakers aren't being detected"
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
        aria-label="Mark moment"
        className="dt-btn"
        data-icon-only
        disabled={!canCapture}
        onClick={onMark}
        title="Mark moment (Alt+Shift+M)"
        type="button"
      >
        <MarkIcon />
      </button>
      <button
        aria-label="Point at element"
        className="dt-btn"
        data-icon-only
        disabled={!canCapture}
        onClick={onPointAt}
        title="Point at element"
        type="button"
      >
        <TargetIcon />
      </button>
    </>
  );
}

function PauseToggle({ snapshot }: { snapshot: RecorderSnapshot }) {
  const { recorder } = useSessionWorkspace();
  if (snapshot.phase === "recording") {
    return (
      <button
        aria-label="Pause"
        className="dt-btn"
        data-icon-only
        onClick={() => recorder.pause("paused")}
        title="Pause"
        type="button"
      >
        <PauseIcon />
      </button>
    );
  }
  if (snapshot.phase === "paused" && snapshot.pauseReason !== "limit") {
    return (
      <button
        aria-label="Resume"
        className="dt-btn"
        data-icon-only
        onClick={() => recorder.resume()}
        title="Resume"
        type="button"
      >
        <PlayIcon />
      </button>
    );
  }
  return null;
}

function CancelButton({
  hasKeptRecording,
  onAskToCancel,
}: {
  hasKeptRecording: boolean;
  onAskToCancel: () => void;
}) {
  const buttonRef = useFocusWhen<HTMLButtonElement>(hasKeptRecording);
  return (
    <button
      aria-label="Cancel recording"
      className="dt-btn"
      data-icon-only
      onClick={onAskToCancel}
      ref={buttonRef}
      title="Cancel recording"
      type="button"
    >
      <CloseIcon />
    </button>
  );
}

function LiveFeedToggle({
  isLiveShown,
  onToggleLive,
}: {
  isLiveShown: boolean;
  onToggleLive: () => void;
}) {
  return (
    <button
      aria-label="Live transcript and intentions"
      aria-pressed={isLiveShown}
      className="dt-btn"
      data-icon-only
      onClick={onToggleLive}
      title={
        isLiveShown
          ? "Hide live transcript and intentions"
          : "Show live transcript and intentions"
      }
      type="button"
    >
      <TranscriptIcon />
    </button>
  );
}

function RecordingControls({
  hasKeptRecording,
  isLiveShown,
  onAskToCancel,
  onFinish,
  onMark,
  onPointAt,
  onToggleLive,
  snapshot,
}: {
  hasKeptRecording: boolean;
  isLiveShown: boolean;
  onAskToCancel: () => void;
  onFinish: () => void;
  onMark: () => void;
  onPointAt: () => void;
  onToggleLive: () => void;
  snapshot: RecorderSnapshot;
}) {
  const { phase } = snapshot;
  const isActive = phase === "recording" || phase === "paused";
  return (
    <>
      {isActive && (
        <>
          <CaptureButtons
            canCapture={phase === "recording"}
            onMark={onMark}
            onPointAt={onPointAt}
          />
          <LiveFeedToggle
            isLiveShown={isLiveShown}
            onToggleLive={onToggleLive}
          />
        </>
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
      {isActive && (
        <CancelButton
          hasKeptRecording={hasKeptRecording}
          onAskToCancel={onAskToCancel}
        />
      )}
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
  isLiveShown,
  onCancel,
  onFinish,
  onPointAt,
  onToggleLive,
  snapshot,
}: {
  isLiveShown: boolean;
  onCancel: () => void;
  onFinish: () => void;
  onPointAt: () => void;
  onToggleLive: () => void;
  snapshot: RecorderSnapshot;
}) {
  const { account, identity, recorder } = useSessionWorkspace();
  const sync = useSyncStatus(account.key);
  const barRef = useRef<HTMLDivElement>(null);
  const { markWithNote, openMark } = useMarkMoment(snapshot, barRef);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirming" | "kept">(
    "idle"
  );
  const keepRecording = useCallback(() => setCancelStep("kept"), []);
  const showsMeter =
    snapshot.phase === "recording" || snapshot.phase === "paused";

  return (
    <div
      aria-label="Session recording"
      className="dt-rec glass"
      data-phase={snapshot.phase}
      ref={barRef}
      role="toolbar"
    >
      <span aria-hidden="true" className="dt-rec-dot" />
      {showsMeter && <LevelMeter recorder={recorder} />}
      <RecordingClock activeMs={snapshot.activeMs} />
      <span aria-live="polite" className="dt-rec-status">
        {statusText(snapshot, sync, identity.limits.maxDurationMs)}
      </span>
      <RecordingControls
        hasKeptRecording={cancelStep === "kept"}
        isLiveShown={isLiveShown}
        onAskToCancel={() => setCancelStep("confirming")}
        onFinish={onFinish}
        onMark={markWithNote}
        onPointAt={onPointAt}
        onToggleLive={onToggleLive}
        snapshot={snapshot}
      />
      {openMark && (
        <MarkNote
          focusOnOpen={openMark.focus}
          key={openMark.key}
          onClose={openMark.closeNote}
        />
      )}
      {cancelStep === "confirming" && (
        <CancelConfirmation
          onCancelRecording={onCancel}
          onKeepRecording={keepRecording}
        />
      )}
    </div>
  );
}
