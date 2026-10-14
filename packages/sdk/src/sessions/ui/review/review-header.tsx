import { useState } from "react";
import { Menu, type MenuItem } from "../../../devtools/client/menu";
import { announce } from "../../../devtools/client/notices";
import { MoreIcon } from "../../../feedback/ui/icons";
import type { SessionDetail, SessionSummary } from "../../protocol";
import { formatDate, shortDuration } from "../session-format";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import { useOptimisticChange } from "./optimistic-change";
import type { ReviewHandle } from "./use-session-detail";

const DELETE_COPY =
  "Delete this session? Its recording, transcript, screenshots and intentions go, along with what later sessions added to those intentions.";

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

export function ReviewHeader({
  onDeleted,
  review,
  session,
}: {
  onDeleted: () => void;
  review: ReviewHandle;
  session: ReviewSession;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const update = useSessionUpdate(review, session);
  const isShared = session.visibility === "team";
  const menuItems: MenuItem[] = [
    { label: "Rename", onSelect: () => setIsRenaming(true) },
    {
      label: isShared ? "Make private" : "Share with team",
      onSelect: () =>
        update("The sharing was not changed", {
          visibility: isShared ? "private" : "team",
        }),
    },
    {
      label: "Delete session",
      onSelect: () => setIsConfirmingDelete(true),
      variant: "danger",
    },
  ];
  return (
    <header className="dt-ses-head">
      {isRenaming ? (
        <TitleEditor
          onDone={() => setIsRenaming(false)}
          review={review}
          session={session}
        />
      ) : (
        <div className="dt-card-head">
          <h2 className="dt-ses-title" tabIndex={-1}>
            {session.title}
          </h2>
          {session.canEdit && (
            <Menu
              items={menuItems}
              trigger={{
                className: "icon-btn",
                content: <MoreIcon />,
                label: "Session options",
              }}
            />
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
          onDeleted={onDeleted}
          sessionId={session.id}
        />
      )}
    </header>
  );
}
