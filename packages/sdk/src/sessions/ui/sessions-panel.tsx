import { useLocalDrafts } from "../local/local-sessions";
import { SessionReview } from "./review/session-review";
import { useSessionWorkspace } from "./session-workspace";
import type { SessionTarget } from "./start/session-list";
import { SessionsHome } from "./start/sessions-home";

export interface SessionNavigation {
  onOpen: (target: SessionTarget | null) => void;
  open: SessionTarget | null;
}

function useResolvedSessionId(target: SessionTarget | null): string | null {
  const { account } = useSessionWorkspace();
  const drafts = useLocalDrafts(account.key);
  if (!target) {
    return null;
  }
  return (
    target.sessionId ??
    drafts.find((draft) => draft.sessionKey === target.sessionKey)?.sessionId ??
    null
  );
}

/** A just-finished session may not have reached Reflet yet: it opens once its id is known. */
export function SessionsPanel({
  navigation,
  onStarted,
  onWriteNote,
}: {
  navigation: SessionNavigation;
  onStarted: () => void;
  onWriteNote?: () => void;
}) {
  const sessionId = useResolvedSessionId(navigation.open);
  const back = () => navigation.onOpen(null);

  if (sessionId) {
    return (
      <SessionReview key={sessionId} onBack={back} sessionId={sessionId} />
    );
  }
  if (navigation.open) {
    return (
      <div className="dt-empty" role="status">
        <p>
          This session is still uploading. It opens here once it reaches Reflet.
        </p>
        <button className="dt-btn" onClick={back} type="button">
          All sessions
        </button>
      </div>
    );
  }
  return (
    <SessionsHome
      onOpenSession={navigation.onOpen}
      onStarted={onStarted}
      onWriteNote={onWriteNote}
    />
  );
}
