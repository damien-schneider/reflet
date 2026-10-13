import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { announce } from "../../../devtools/client/notices";
import { MoreIcon } from "../../../feedback/ui/icons";
import type { SessionDetail, SessionSummary } from "../../protocol";
import { formatDate, shortDuration } from "../session-format";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import { useOptimisticChange } from "./optimistic-change";
import type { ReviewHandle } from "./use-session-detail";

const DELETE_COPY =
  "Delete this session? Its recordings, transcript and intentions are removed, including what later sessions added to those intentions. Briefs you already copied or exported can't be recalled.";

type ReviewSession = SessionDetail["session"];

type SessionChange = Partial<Pick<ReviewSession, "title" | "visibility">>;

function withSessionFields(change: SessionChange) {
  return (detail: SessionDetail): SessionDetail => ({
    ...detail,
    session: { ...detail.session, ...change },
  });
}

function fieldsBefore(
  session: ReviewSession,
  change: SessionChange
): SessionChange {
  return {
    ...(change.title === undefined ? {} : { title: session.title }),
    ...(change.visibility === undefined
      ? {}
      : { visibility: session.visibility }),
  };
}

function useSessionUpdate(review: ReviewHandle, session: ReviewSession) {
  const { api } = useSessionWorkspace();
  const applyChange = useOptimisticChange(review);
  return (failureLabel: string, change: SessionChange) =>
    applyChange({
      failureLabel,
      request: () => api.update({ sessionId: session.id, ...change }),
      rollback: withSessionFields(fieldsBefore(session, change)),
      settle: (detail, saved: SessionSummary) =>
        withSessionFields(saved)(detail),
      show: withSessionFields(change),
    });
}

function TitleEditor({
  onDone,
  review,
  session,
}: {
  onDone: () => void;
  review: ReviewHandle;
  session: ReviewSession;
}) {
  const [title, setTitle] = useState(session.title);
  const update = useSessionUpdate(review, session);
  return (
    <form
      className="dt-search"
      onSubmit={(event) => {
        event.preventDefault();
        update("The title was not saved", { title: title.trim() });
        onDone();
      }}
    >
      <input
        aria-label="Session title"
        className="dt-field"
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        value={title}
      />
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={title.trim() === ""}
        type="submit"
      >
        Save
      </button>
      <button className="dt-btn" onClick={onDone} type="button">
        Cancel
      </button>
    </form>
  );
}

function DeleteConfirmation({
  onCancel,
  onDeleted,
  sessionId,
}: {
  onCancel: () => void;
  onDeleted: () => void;
  sessionId: string;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteSession = async () => {
    setIsDeleting(true);
    const deleted = await run("The session was not deleted", () =>
      api.deleteSession(sessionId)
    );
    if (deleted === null) {
      setIsDeleting(false);
      return;
    }
    announce("Session deleted");
    onDeleted();
  };
  return (
    <div className="dt-ses-banner">
      <p>{DELETE_COPY}</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
          disabled={isDeleting}
          onClick={deleteSession}
          type="button"
        >
          Delete
        </button>
        <button className="dt-btn" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

function useDismissOnOutside(isOpen: boolean, close: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const container = containerRef.current;
    const closeOnOutsidePointer = (event: Event) => {
      if (container && !event.composedPath().includes(container)) {
        closeRef.current();
      }
    };
    const closeOnEscape = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    container?.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      container?.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);
  return containerRef;
}

interface SessionMenuActions {
  onDelete: () => void;
  onRename: () => void;
  onToggleSharing: () => void;
}

function SessionMenu({
  actions,
  isShared,
}: {
  actions: SessionMenuActions;
  isShared: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const close = () => setIsOpen(false);
  const containerRef = useDismissOnOutside(isOpen, close);
  const choose = (action: () => void) => () => {
    close();
    action();
  };
  return (
    <div className="dt-ses-menu" ref={containerRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label="Session options"
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div className="dt-ses-menu-list" id={menuId}>
          <button
            className="dt-ses-menu-item"
            onClick={choose(actions.onRename)}
            type="button"
          >
            Rename
          </button>
          <button
            className="dt-ses-menu-item"
            onClick={choose(actions.onToggleSharing)}
            type="button"
          >
            {isShared ? "Make private" : "Share with team"}
          </button>
          <button
            className="dt-ses-menu-item"
            data-variant="danger"
            onClick={choose(actions.onDelete)}
            type="button"
          >
            Delete session
          </button>
        </div>
      )}
    </div>
  );
}

export function ReviewHeader({
  onBack,
  review,
  session,
}: {
  onBack: () => void;
  review: ReviewHandle;
  session: ReviewSession;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const update = useSessionUpdate(review, session);
  const isShared = session.visibility === "team";
  const menuActions: SessionMenuActions = {
    onDelete: () => setIsConfirmingDelete(true),
    onRename: () => setIsRenaming(true),
    onToggleSharing: () =>
      update("The sharing was not changed", {
        visibility: isShared ? "private" : "team",
      }),
  };
  return (
    <header className="dt-ses-head">
      <button className="dt-ses-link" onClick={onBack} type="button">
        ← All sessions
      </button>
      {isRenaming ? (
        <TitleEditor
          onDone={() => setIsRenaming(false)}
          review={review}
          session={session}
        />
      ) : (
        <div className="dt-card-head">
          <h2 className="dt-ses-title">{session.title}</h2>
          {session.canEdit && (
            <SessionMenu actions={menuActions} isShared={isShared} />
          )}
        </div>
      )}
      <p className="dt-meta">
        {formatDate(session.startedAt)} · {shortDuration(session.durationMs)} ·{" "}
        {isShared ? "Shared with team" : "Private"}
        {session.isMine ? "" : ` · ${session.authorName ?? "A teammate"}`}
      </p>
      {isConfirmingDelete && session.canEdit && (
        <DeleteConfirmation
          onCancel={() => setIsConfirmingDelete(false)}
          onDeleted={onBack}
          sessionId={session.id}
        />
      )}
    </header>
  );
}
