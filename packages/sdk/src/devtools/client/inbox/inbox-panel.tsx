import { useCallback, useEffect, useState } from "react";
import type { CodeTarget } from "../code/code-panel";
import {
  type BoardFeedback,
  fetchBoardFeedbackForPage,
} from "../route/dev-route";
import { FeedbackCard } from "./feedback-card";

type InboxState =
  | { kind: "failed"; message: string }
  | { kind: "loading" }
  | { items: BoardFeedback[]; kind: "ready"; pagePath: string };

function useBoardFeedbackForPage() {
  const [state, setState] = useState<InboxState>({ kind: "loading" });

  const load = useCallback(async () => {
    const pagePath = window.location.pathname;
    setState({ kind: "loading" });
    try {
      const items = await fetchBoardFeedbackForPage(pagePath);
      setState({ items, kind: "ready", pagePath });
    } catch (error) {
      setState({
        kind: "failed",
        message:
          error instanceof Error ? error.message : "Could not reach the board.",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { load, state };
}

export function InboxPanel({
  onOpenCode,
  onShowSelector,
}: {
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
}) {
  const { load, state } = useBoardFeedbackForPage();

  return (
    <>
      <div className="dt-card-head">
        <p className="dt-status">
          {state.kind === "ready"
            ? `${state.items.length} on ${state.pagePath}`
            : "Board feedback on this page"}
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
      {state.kind === "ready" && state.items.length === 0 && (
        <div className="dt-empty">
          <p>Nothing on the board points at this page yet.</p>
        </div>
      )}
      {state.kind === "ready" &&
        state.items.map((item) => (
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
