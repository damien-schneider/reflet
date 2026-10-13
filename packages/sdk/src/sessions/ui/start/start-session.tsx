import { useState } from "react";
import type {
  RecorderSnapshot,
  RecorderStartOptions,
} from "../../recorder/session-recorder";
import { useRecorderSnapshot } from "../../recorder/use-recorder-snapshot";
import { useSessionWorkspace } from "../session-workspace";
import { markDisclosureSeen, SessionDisclosure } from "./session-disclosure";

type StartFailure = NonNullable<RecorderSnapshot["failure"]>;

const IS_MICROPHONE_FAILURE: Record<StartFailure["kind"], boolean> = {
  auth: false,
  insecure_context: true,
  limit: false,
  mic_blocked_by_site: true,
  mic_denied: true,
  mic_unavailable: true,
  network: false,
  storage: false,
};

export function StartProblem({
  failure,
  onRetry,
  onWriteNote,
}: {
  failure: StartFailure;
  onRetry: () => void;
  onWriteNote?: () => void;
}) {
  return (
    <div className="dt-ses-problem" role="alert">
      <p className="dt-error">{failure.message}</p>
      <div className="dt-actions">
        <button className="dt-btn" onClick={onRetry} type="button">
          Try again
        </button>
        {IS_MICROPHONE_FAILURE[failure.kind] && onWriteNote && (
          <button className="dt-btn" onClick={onWriteNote} type="button">
            Write a note instead
          </button>
        )}
      </div>
    </div>
  );
}

function StartActions({
  isBusy,
  onStart,
  onWriteNote,
}: {
  isBusy: boolean;
  onStart: () => void;
  onWriteNote?: () => void;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={isBusy}
        onClick={onStart}
        type="button"
      >
        Start session
      </button>
      {onWriteNote && (
        <button className="dt-btn" onClick={onWriteNote} type="button">
          Write a note instead
        </button>
      )}
    </div>
  );
}

export function useRecorderStart(onStarted: () => void) {
  const { account, recorder } = useSessionWorkspace();
  const snapshot = useRecorderSnapshot(recorder);
  const [hasTried, setHasTried] = useState(false);

  const start = async (options: RecorderStartOptions) => {
    markDisclosureSeen(account.key);
    setHasTried(true);
    await recorder.start(options);
    if (recorder.getSnapshot().phase === "recording") {
      onStarted();
    }
  };

  const isRequesting = snapshot.phase === "requesting";
  const failure =
    hasTried && snapshot.phase === "failed" && snapshot.sessionKey === null
      ? snapshot.failure
      : null;
  return {
    failure,
    isBusy: isRequesting || snapshot.phase === "finishing",
    isRequesting,
    start,
  };
}

export function MicrophonePrompt({ isRequesting }: { isRequesting: boolean }) {
  return (
    <p aria-live="polite" className="dt-meta">
      {isRequesting ? "Allow the microphone in your browser to start." : ""}
    </p>
  );
}

export function StartSession({
  onStarted,
  onWriteNote,
}: {
  onStarted: () => void;
  onWriteNote?: () => void;
}) {
  const { account } = useSessionWorkspace();
  const { failure, isBusy, isRequesting, start } = useRecorderStart(onStarted);
  const startBlank = () => start({});

  return (
    <>
      <SessionDisclosure accountKey={account.key} />
      <MicrophonePrompt isRequesting={isRequesting} />
      {failure ? (
        <StartProblem
          failure={failure}
          onRetry={startBlank}
          onWriteNote={onWriteNote}
        />
      ) : (
        <StartActions
          isBusy={isBusy}
          onStart={startBlank}
          onWriteNote={onWriteNote}
        />
      )}
    </>
  );
}
