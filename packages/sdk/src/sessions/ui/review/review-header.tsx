import { useState } from "react";
import { announce } from "../../../devtools/client/notices";
import { MoreIcon } from "../../../feedback/ui/icons";
import type { SessionDetail, SessionSummary } from "../../protocol";
import { formatDate, shortDuration } from "../session-format";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import type { ReviewHandle } from "./use-session-detail";

const DELETE_COPY =
  "Delete this session? Its recordings, transcript and intentions are removed, including what later sessions added to those intentions. Briefs you already copied or exported can't be recalled.";

type ReviewSession = SessionDetail["session"];

function useSessionUpdate(review: ReviewHandle, sessionId: string) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  return async (
    failureLabel: string,
    change: { title?: string; visibility?: SessionSummary["visibility"] }
  ) => {
    const updated = await run(failureLabel, () =>
      api.update({ sessionId, ...change })
    );
    if (updated) {
      review.patch((detail) => ({
        ...detail,
        session: { ...detail.session, ...updated },
      }));
    }
    return updated !== null;
  };
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
  const update = useSessionUpdate(review, session.id);
  return (
    <form
      className="dt-search"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await update("The title was not saved", { title: title.trim() })) {
          onDone();
        }
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
  const deleteSession = async () => {
    const deleted = await run("The session was not deleted", () =>
      api.deleteSession(sessionId)
    );
    if (deleted !== null) {
      announce("Session deleted");
      onDeleted();
    }
  };
  return (
    <div className="dt-ses-banner">
      <p>{DELETE_COPY}</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
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

function SessionMenu({
  onDeleted,
  review,
  session,
}: {
  onDeleted: () => void;
  review: ReviewHandle;
  session: ReviewSession;
}) {
  const update = useSessionUpdate(review, session.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const isShared = session.visibility === "team";

  if (isConfirming) {
    return (
      <DeleteConfirmation
        onCancel={() => setIsConfirming(false)}
        onDeleted={onDeleted}
        sessionId={session.id}
      />
    );
  }
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        onClick={() =>
          update("The sharing was not changed", {
            visibility: isShared ? "private" : "team",
          })
        }
        type="button"
      >
        {isShared ? "Make private" : "Share with team"}
      </button>
      <button
        className="dt-btn"
        data-variant="danger"
        onClick={() => setIsConfirming(true)}
        type="button"
      >
        Delete session
      </button>
    </div>
  );
}

function HeaderTitle({
  isMenuOpen,
  onRename,
  onToggleMenu,
  session,
}: {
  isMenuOpen: boolean;
  onRename: () => void;
  onToggleMenu: () => void;
  session: ReviewSession;
}) {
  return (
    <div className="dt-card-head">
      <h2 className="dt-ses-title">{session.title}</h2>
      {session.canEdit && (
        <>
          <button className="dt-btn" onClick={onRename} type="button">
            Rename
          </button>
          <button
            aria-expanded={isMenuOpen}
            aria-label="Session options"
            className="icon-btn"
            onClick={onToggleMenu}
            type="button"
          >
            <MoreIcon />
          </button>
        </>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const visibility =
    session.visibility === "team" ? "Shared with team" : "Private";
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
        <HeaderTitle
          isMenuOpen={isMenuOpen}
          onRename={() => setIsRenaming(true)}
          onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
          session={session}
        />
      )}
      <p className="dt-meta">
        {formatDate(session.startedAt)} · {shortDuration(session.durationMs)} ·{" "}
        {visibility}
        {session.isMine ? "" : ` · ${session.authorName ?? "A teammate"}`}
      </p>
      {isMenuOpen && session.canEdit && (
        <SessionMenu onDeleted={onBack} review={review} session={session} />
      )}
    </header>
  );
}
