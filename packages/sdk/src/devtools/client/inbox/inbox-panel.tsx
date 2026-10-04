import { useCallback, useEffect, useState } from "react";
import type { CodeTarget } from "../code/code-panel";
import { type BoardFeedbackPage, fetchBoardFeedback } from "../route/dev-route";
import { FeedbackCard } from "./feedback-card";

type InboxScope = "board" | "page";

const INBOX_SCOPES: readonly InboxScope[] = ["page", "board"];

const SCOPE_LABELS: Record<InboxScope, string> = {
  board: "Whole board",
  page: "This page",
};

const EMPTY_SCOPE_MESSAGES: Record<InboxScope, string> = {
  board: "The board has no feedback yet.",
  page: "Nothing on the board points at this page yet.",
};

type InboxState =
  | { kind: "failed"; message: string }
  | { kind: "loading" }
  | { kind: "ready"; page: BoardFeedbackPage; place: string };

function useBoardFeedback(scope: InboxScope) {
  const [state, setState] = useState<InboxState>({ kind: "loading" });

  const load = useCallback(async () => {
    const pagePath = scope === "page" ? window.location.pathname : null;
    setState({ kind: "loading" });
    try {
      const page = await fetchBoardFeedback(pagePath);
      setState({ kind: "ready", page, place: pagePath ?? "the board" });
    } catch (error) {
      setState({
        kind: "failed",
        message:
          error instanceof Error ? error.message : "Could not reach the board.",
      });
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { load, state };
}

function BoardFeedbackList({
  onOpenCode,
  onShowSelector,
  onShowWholeBoard,
  scope,
}: {
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
  onShowWholeBoard: () => void;
  scope: InboxScope;
}) {
  const { load, state } = useBoardFeedback(scope);

  return (
    <>
      <div className="dt-card-head">
        <p className="dt-status">
          {state.kind === "ready"
            ? `${state.page.total} on ${state.place}`
            : "Board feedback"}
        </p>
        <button
          className="dt-btn"
          disabled={state.kind === "loading"}
          onClick={load}
          type="button"
        >
          Refresh
        </button>
      </div>
      {state.kind === "loading" && <p className="dt-status">Loading…</p>}
      {state.kind === "failed" && <p className="dt-error">{state.message}</p>}
      {state.kind === "ready" && state.page.items.length === 0 && (
        <div className="dt-empty">
          <p>{EMPTY_SCOPE_MESSAGES[scope]}</p>
          {scope === "page" && (
            <button className="dt-btn" onClick={onShowWholeBoard} type="button">
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
    <>
      <div className="dt-tabs">
        {INBOX_SCOPES.map((option) => (
          <button
            aria-pressed={option === scope}
            className="dt-tab"
            key={option}
            onClick={() => setScope(option)}
            type="button"
          >
            {SCOPE_LABELS[option]}
          </button>
        ))}
      </div>
      <BoardFeedbackList
        key={scope}
        onOpenCode={onOpenCode}
        onShowSelector={onShowSelector}
        onShowWholeBoard={() => setScope("board")}
        scope={scope}
      />
    </>
  );
}
