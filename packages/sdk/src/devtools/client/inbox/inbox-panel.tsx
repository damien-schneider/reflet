import { useCallback, useEffect, useRef, useState } from "react";
import type { CodeTarget } from "../code/code-panel";
import { RefreshIcon, ViewOptionsIcon } from "../devtools-icons";
import { Menu } from "../menu";
import { type BoardFeedbackPage, fetchBoardFeedback } from "../route/dev-route";
import { FeedbackCard } from "./feedback-card";

type InboxScope = "board" | "page";

const INBOX_SCOPES: readonly InboxScope[] = ["page", "board"];

const SCOPE_LABELS: Record<InboxScope, string> = {
  board: "Whole board",
  page: "This page",
};

const SCOPE_PLACES: Record<InboxScope, string> = {
  board: "on the board",
  page: "on this page",
};

const EMPTY_SCOPE_MESSAGES: Record<InboxScope, string> = {
  board: "The board has no feedback yet.",
  page: "Nothing on the board points at this page yet.",
};

type InboxState =
  | { kind: "failed"; message: string }
  | { kind: "loading" }
  | { kind: "ready"; page: BoardFeedbackPage };

function useBoardFeedback(scope: InboxScope) {
  const [state, setState] = useState<InboxState>({ kind: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    setState({ kind: "loading" });
    try {
      const page = await fetchBoardFeedback(
        scope === "page" ? window.location.pathname : null
      );
      if (request === latestRequest.current) {
        setState({ kind: "ready", page });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        setState({
          kind: "failed",
          message:
            error instanceof Error
              ? error.message
              : "Could not reach the board.",
        });
      }
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { load, state };
}

function InboxToolbar({
  onRefresh,
  onSelectScope,
  scope,
  state,
}: {
  onRefresh: () => void;
  onSelectScope: (scope: InboxScope) => void;
  scope: InboxScope;
  state: InboxState;
}) {
  return (
    <div className="dt-toolbar">
      <span className="dt-status">
        {state.kind === "ready" && state.page.total > 0
          ? `${state.page.total} ${SCOPE_PLACES[scope]}`
          : SCOPE_LABELS[scope]}
      </span>
      <Menu
        items={INBOX_SCOPES.map((option) => ({
          checked: option === scope,
          label: SCOPE_LABELS[option],
          onSelect: () => onSelectScope(option),
        }))}
        trigger={{
          className: "icon-btn",
          content: <ViewOptionsIcon />,
          label: "Show feedback from",
        }}
      />
      <button
        aria-label="Refresh"
        className="icon-btn"
        disabled={state.kind === "loading"}
        onClick={onRefresh}
        title="Refresh"
        type="button"
      >
        <RefreshIcon />
      </button>
    </div>
  );
}

function BoardFeedbackList({
  onOpenCode,
  onSelectScope,
  onShowSelector,
  scope,
}: {
  onOpenCode: (target: CodeTarget) => void;
  onSelectScope: (scope: InboxScope) => void;
  onShowSelector: (selector: string) => boolean;
  scope: InboxScope;
}) {
  const { load, state } = useBoardFeedback(scope);

  return (
    <>
      <InboxToolbar
        onRefresh={load}
        onSelectScope={onSelectScope}
        scope={scope}
        state={state}
      />
      {state.kind === "loading" && <p className="dt-status">Loading…</p>}
      {state.kind === "failed" && (
        <p className="dt-error" role="alert">
          {state.message}
        </p>
      )}
      {state.kind === "ready" && state.page.items.length === 0 && (
        <div className="dt-empty">
          <p>{EMPTY_SCOPE_MESSAGES[scope]}</p>
          {scope === "page" && (
            <button
              className="dt-btn"
              onClick={() => onSelectScope("board")}
              type="button"
            >
              Show the whole board
            </button>
          )}
        </div>
      )}
      {state.kind === "ready" &&
        state.page.items.map((item) => (
          <FeedbackCard
            item={item}
            key={item.id}
            onOpenCode={onOpenCode}
            onShowSelector={onShowSelector}
          />
        ))}
    </>
  );
}

export function InboxPanel({
  onOpenCode,
  onShowSelector,
}: {
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
}) {
  const [scope, setScope] = useState<InboxScope>("page");
  return (
    <BoardFeedbackList
      onOpenCode={onOpenCode}
      onSelectScope={setScope}
      onShowSelector={onShowSelector}
      scope={scope}
    />
  );
}
