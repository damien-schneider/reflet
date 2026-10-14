import { useState } from "react";
import type { SheetPlace } from "../../devtools/client/devtools-sheet";
import { useLocalDrafts } from "../local/local-sessions";
import { SessionReview } from "./review/session-review";
import { useSessionWorkspace } from "./session-workspace";
import type { SessionTarget } from "./start/session-list";
import { SessionsHome } from "./start/sessions-home";

export type SessionPlace =
  | { view: "home" }
  | { target: SessionTarget; view: "brief" | "review" };

export interface SessionNavigation {
  go: (place: SessionPlace) => void;
  place: SessionPlace;
}

const SESSIONS_HOME: SessionPlace = { view: "home" };

export function useSessionNavigation(): SessionNavigation {
  const [place, setPlace] = useState<SessionPlace>(SESSIONS_HOME);
  return { go: setPlace, place };
}

/** Where the panel header's back button leads; null on the sessions home. */
export function sessionSheetPlace({
  go,
  place,
}: SessionNavigation): SheetPlace | null {
  if (place.view === "home") {
    return null;
  }
  const sessionRef = place.target.sessionId ?? place.target.sessionKey ?? "";
  if (place.view === "review") {
    return {
      backLabel: "Sessions",
      id: `review:${sessionRef}`,
      onBack: () => go(SESSIONS_HOME),
    };
  }
  return {
    backLabel: "Session",
    id: `brief:${sessionRef}`,
    onBack: () => go({ target: place.target, view: "review" }),
  };
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
  const { go, place } = navigation;
  const target = place.view === "home" ? null : place.target;
  const sessionId = useResolvedSessionId(target);

  if (!target) {
    return (
      <SessionsHome
        onOpenSession={(opened) => go({ target: opened, view: "review" })}
        onStarted={onStarted}
        onWriteNote={onWriteNote}
      />
    );
  }
  if (!sessionId) {
    return (
      <p className="dt-empty" role="status">
        This session is still uploading. It opens here once it reaches Reflet.
      </p>
    );
  }
  return (
    <SessionReview
      isBriefOpen={place.view === "brief"}
      key={sessionId}
      links={{
        onDeleted: () => go(SESSIONS_HOME),
        onOpenBrief: () => go({ target, view: "brief" }),
        onOpenSession: (openedId) =>
          go({
            target: { sessionId: openedId, sessionKey: null },
            view: "review",
          }),
        onStarted,
      }}
      sessionId={sessionId}
    />
  );
}
