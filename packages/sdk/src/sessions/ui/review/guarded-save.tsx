import { useState } from "react";
import { SessionApiError } from "../../api/session-api";
import {
  failureMessage,
  isUnauthorized,
  useSessionWorkspace,
} from "../session-workspace";

export type SaveProblem =
  | { kind: "stale" }
  | { kind: "failed"; message: string };

export function useGuardedSave() {
  const { onUnauthorized } = useSessionWorkspace();
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (write: () => Promise<void>) => {
    setIsSaving(true);
    setProblem(null);
    try {
      await write();
    } catch (error) {
      if (isUnauthorized(error)) {
        onUnauthorized();
      } else if (error instanceof SessionApiError && error.status === 409) {
        setProblem({ kind: "stale" });
      } else {
        setProblem({ kind: "failed", message: failureMessage(error) });
      }
    }
    setIsSaving(false);
  };
  return { isSaving, problem, save };
}

export function SaveProblemMessage({
  onReload,
  problem,
}: {
  onReload: () => void;
  problem: SaveProblem;
}) {
  return (
    <div className="dt-actions" role="alert">
      <p className="dt-error">
        {problem.kind === "stale"
          ? "Someone changed this since you opened it. Reload it, then edit again."
          : `Not saved: ${problem.message}`}
      </p>
      {problem.kind === "stale" && (
        <button className="dt-btn" onClick={onReload} type="button">
          Reload
        </button>
      )}
    </div>
  );
}
