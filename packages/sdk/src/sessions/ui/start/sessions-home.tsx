import { discardLocalDraft, useLocalDrafts } from "../../local/local-sessions";
import type { LocalDraft } from "../../local/session-store";
import { formatDate } from "../session-format";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import { SessionList, type SessionTarget } from "./session-list";
import { StartSession } from "./start-session";

interface InterruptedDraftProps {
  draft: LocalDraft;
  onOpenSession: (target: SessionTarget) => void;
  onStarted: () => void;
}

function useDraftRecovery({
  draft,
  onOpenSession,
  onStarted,
}: InterruptedDraftProps) {
  const { account, api, recorder } = useSessionWorkspace();
  const run = useSessionAction();

  const review = async () => {
    const closed = await run("The session was not closed", () =>
      discardLocalDraft({
        accountKey: account.key,
        api,
        sessionKey: draft.sessionKey,
      })
    );
    if (closed !== null) {
      onOpenSession({
        sessionId: draft.sessionId,
        sessionKey: draft.sessionKey,
      });
    }
  };

  const resume = async () => {
    await recorder.resumeDraft(draft.sessionKey);
    if (recorder.getSnapshot().phase === "recording") {
      onStarted();
    }
  };

  return { resume, review };
}

function InterruptedDraft(props: InterruptedDraftProps) {
  const { resume, review } = useDraftRecovery(props);

  return (
    <div className="dt-ses-banner" role="status">
      <p>
        Your session from {formatDate(props.draft.startedAt)} stopped when the
        page reloaded. The microphone is off.
      </p>
      <div className="dt-actions">
        <button className="dt-btn" onClick={review} type="button">
          Review
        </button>
        <button className="dt-btn" onClick={resume} type="button">
          Resume recording
        </button>
      </div>
    </div>
  );
}

export function SessionsHome({
  onOpenSession,
  onStarted,
  onWriteNote,
}: {
  onOpenSession: (target: SessionTarget) => void;
  onStarted: () => void;
  onWriteNote?: () => void;
}) {
  const { account } = useSessionWorkspace();
  const drafts = useLocalDrafts(account.key);
  const interrupted = drafts.filter((draft) => draft.state === "interrupted");

  return (
    <>
      {interrupted.map((draft) => (
        <InterruptedDraft
          draft={draft}
          key={draft.sessionKey}
          onOpenSession={onOpenSession}
          onStarted={onStarted}
        />
      ))}
      <StartSession onStarted={onStarted} onWriteNote={onWriteNote} />
      <SessionList drafts={drafts} onOpen={onOpenSession} />
    </>
  );
}
