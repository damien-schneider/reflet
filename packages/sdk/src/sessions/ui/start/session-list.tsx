import { useEffect, useState } from "react";
import type { LocalDraft } from "../../local/session-store";
import type { SessionSummary } from "../../protocol";
import {
  formatDate,
  sessionStatusLine,
  shortDuration,
} from "../session-format";
import {
  failureMessage,
  isUnauthorized,
  useSessionWorkspace,
} from "../session-workspace";

export interface SessionTarget {
  sessionId: string | null;
  sessionKey: string | null;
}

type ListState =
  | { kind: "loading" }
  | { kind: "failed"; message: string; retry: () => void }
  | { kind: "ready"; sessions: SessionSummary[] };

function useSessionList(): ListState {
  const { api, onUnauthorized } = useSessionWorkspace();
  const [state, setState] = useState<ListState>({ kind: "loading" });

  useEffect(() => {
    let isCurrent = true;
    const load = () => {
      setState({ kind: "loading" });
      api.list().then(
        (sessions) => isCurrent && setState({ kind: "ready", sessions }),
        (error: unknown) => {
          if (isUnauthorized(error)) {
            onUnauthorized();
          } else if (isCurrent) {
            const message = failureMessage(error);
            setState({ kind: "failed", message, retry: load });
          }
        }
      );
    };
    load();
    return () => {
      isCurrent = false;
    };
  }, [api, onUnauthorized]);

  return state;
}

function SessionRow({
  isInterrupted,
  onOpen,
  session,
}: {
  isInterrupted: boolean;
  onOpen: () => void;
  session: SessionSummary;
}) {
  const author = session.isMine
    ? ""
    : ` · ${session.authorName ?? "A teammate"}`;
  return (
    <li>
      <button className="dt-ses-row" onClick={onOpen} type="button">
        <span className="dt-card-title">{session.title}</span>
        <span className="dt-meta">
          {formatDate(session.startedAt)} · {shortDuration(session.durationMs)}
          {author}
        </span>
        <span className="dt-meta">
          {isInterrupted
            ? "Interrupted · microphone off"
            : sessionStatusLine(session)}
        </span>
      </button>
    </li>
  );
}

function UploadingDrafts({ drafts }: { drafts: LocalDraft[] }) {
  const waiting = drafts.filter(
    (draft) => draft.sessionId === null && draft.state === "ended"
  );
  if (waiting.length === 0) {
    return null;
  }
  return (
    <ul className="dt-ses-rows">
      {waiting.map((draft) => (
        <li className="dt-ses-row" key={draft.sessionKey}>
          <span className="dt-card-title">{draft.title}</span>
          <span className="dt-meta">
            {formatDate(draft.startedAt)} · Waiting to upload
          </span>
        </li>
      ))}
    </ul>
  );
}

function SessionGroup({
  interruptedIds,
  onOpen,
  sessions,
  title,
}: {
  interruptedIds: ReadonlySet<string>;
  onOpen: (target: SessionTarget) => void;
  sessions: SessionSummary[];
  title: string;
}) {
  if (sessions.length === 0) {
    return null;
  }
  return (
    <>
      <h2 className="dt-group">{title}</h2>
      <ul className="dt-ses-rows">
        {sessions.map((session) => (
          <SessionRow
            isInterrupted={
              session.collection !== "ended" && interruptedIds.has(session.id)
            }
            key={session.id}
            onOpen={() => onOpen({ sessionId: session.id, sessionKey: null })}
            session={session}
          />
        ))}
      </ul>
    </>
  );
}

export function SessionList({
  drafts,
  onOpen,
}: {
  drafts: LocalDraft[];
  onOpen: (target: SessionTarget) => void;
}) {
  const state = useSessionList();
  if (state.kind === "loading") {
    return <p className="dt-status">Loading sessions…</p>;
  }
  if (state.kind === "failed") {
    return (
      <div className="dt-actions">
        <p className="dt-error">Sessions did not load: {state.message}</p>
        <button className="dt-btn" onClick={state.retry} type="button">
          Try again
        </button>
      </div>
    );
  }
  const mine = state.sessions.filter((session) => session.isMine);
  const shared = state.sessions.filter((session) => !session.isMine);
  const interruptedIds = new Set(
    drafts.flatMap((draft) =>
      draft.state === "interrupted" && draft.sessionId ? [draft.sessionId] : []
    )
  );
  return (
    <>
      <UploadingDrafts drafts={drafts} />
      <SessionGroup
        interruptedIds={interruptedIds}
        onOpen={onOpen}
        sessions={mine}
        title="Your sessions"
      />
      <SessionGroup
        interruptedIds={interruptedIds}
        onOpen={onOpen}
        sessions={shared}
        title="Shared with the team"
      />
    </>
  );
}
