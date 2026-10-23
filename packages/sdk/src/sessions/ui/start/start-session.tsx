import { type ReactNode, useId, useState } from "react";
import type {
  RecorderSnapshot,
  RecorderStartOptions,
} from "../../recorder/session-recorder";
import { useRecorderSnapshot } from "../../recorder/use-recorder-snapshot";
import { MicIcon } from "../session-icons";
import { useSessionWorkspace } from "../session-workspace";
import {
  hasSeenDisclosure,
  markDisclosureSeen,
  SessionDisclosure,
} from "./session-disclosure";

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

function SpeakersChoice({
  detectSpeakers,
  isBusy,
  onChange,
}: {
  detectSpeakers: boolean;
  isBusy: boolean;
  onChange: (detectSpeakers: boolean) => void;
}) {
  const hintId = useId();
  return (
    <div>
      <label className="dt-ses-check">
        <input
          aria-describedby={hintId}
          checked={detectSpeakers}
          disabled={isBusy}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>Several people are talking</span>
      </label>
      <p className="dt-meta" id={hintId}>
        Mistral tells the voices apart so each passage shows who spoke.
      </p>
    </div>
  );
}

function StartActions({
  children,
  isBusy,
  onStart,
}: {
  children: ReactNode;
  isBusy: boolean;
  onStart: () => void;
}) {
  return (
    <div className="dt-ses-start">
      <p className="dt-meta">
        Talk while you use the app. Reflet turns what you say and show into
        intentions you can brief an agent with.
      </p>
      {children}
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          disabled={isBusy}
          onClick={onStart}
          type="button"
        >
          <MicIcon />
          Start session
        </button>
      </div>
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
  const { account, identity } = useSessionWorkspace();
  const { failure, isBusy, isRequesting, start } = useRecorderStart(onStarted);
  const [isFirstVisit] = useState(() => !hasSeenDisclosure(account.key));
  const [detectSpeakers, setDetectSpeakers] = useState(false);
  const startSession = () => start({ detectSpeakers });
  const disclosure = <SessionDisclosure accountKey={account.key} />;

  return (
    <>
      {isFirstVisit && disclosure}
      {failure ? (
        <StartProblem
          failure={failure}
          onRetry={startSession}
          onWriteNote={onWriteNote}
        />
      ) : (
        <StartActions isBusy={isBusy} onStart={startSession}>
          {identity.speakersConfigured && (
            <SpeakersChoice
              detectSpeakers={detectSpeakers}
              isBusy={isBusy}
              onChange={setDetectSpeakers}
            />
          )}
        </StartActions>
      )}
      <MicrophonePrompt isRequesting={isRequesting} />
      {!isFirstVisit && disclosure}
    </>
  );
}
