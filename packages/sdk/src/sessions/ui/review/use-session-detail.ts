import { useEffect, useState } from "react";
import { reportFailure } from "../../../devtools/client/notices";
import { SessionApiError } from "../../api/session-api";
import type {
  SessionDetail,
  SessionProposal,
  SessionSegment,
} from "../../protocol";
import { isDetailProcessing } from "../session-format";
import {
  failureMessage,
  isUnauthorized,
  useSessionWorkspace,
} from "../session-workspace";

const POLL_INTERVAL_MS = 2000;

export type DetailState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "failed"; message: string }
  | { detail: SessionDetail; kind: "ready" };

export interface SessionDetailHandle {
  patch: (update: (detail: SessionDetail) => SessionDetail) => void;
  reload: () => void;
  state: DetailState;
}

export type ReviewHandle = Pick<SessionDetailHandle, "patch" | "reload">;

interface DetailRequest {
  count: number;
  sessionId: string;
}

function nextRequest(current: DetailRequest): DetailRequest {
  return { ...current, count: current.count + 1 };
}

export function withProposal(
  detail: SessionDetail,
  proposal: SessionProposal
): SessionDetail {
  const isKnown = detail.proposals.some((item) => item.id === proposal.id);
  return {
    ...detail,
    proposals: isKnown
      ? detail.proposals.map((item) =>
          item.id === proposal.id ? proposal : item
        )
      : [...detail.proposals, proposal],
  };
}

export function withSegment(
  detail: SessionDetail,
  segment: SessionSegment
): SessionDetail {
  const others = detail.segments.filter((item) => item.id !== segment.id);
  return {
    ...detail,
    segments: [...others, segment].sort((a, b) => a.startMs - b.startMs),
  };
}

function isHidden(): boolean {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

function usePollTick(lastAnswer: DetailState): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (lastAnswer.kind !== "ready" || !isDetailProcessing(lastAnswer.detail)) {
      return;
    }
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      if (!isHidden()) {
        timer = window.setTimeout(
          () => setTick((current) => current + 1),
          POLL_INTERVAL_MS
        );
      }
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [lastAnswer]);
  return tick;
}

function failedState(error: unknown, current: DetailState): DetailState {
  if (error instanceof SessionApiError && error.status === 404) {
    return { kind: "missing" };
  }
  if (current.kind === "ready") {
    return current;
  }
  return { kind: "failed", message: failureMessage(error) };
}

export function useSessionDetail(sessionId: string): SessionDetailHandle {
  const { api, onUnauthorized } = useSessionWorkspace();
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [request, setRequest] = useState<DetailRequest>({
    count: 0,
    sessionId,
  });
  const pollTick = usePollTick(state);

  useEffect(() => {
    let isCurrent = true;
    api.detail(request.sessionId).then(
      (detail) => isCurrent && setState({ detail, kind: "ready" }),
      (error: unknown) => {
        if (isUnauthorized(error)) {
          onUnauthorized();
          return;
        }
        if (isCurrent) {
          setState((current) => failedState(error, current));
        }
        if (isCurrent && request.count + pollTick > 0) {
          reportFailure("The session did not refresh", error);
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [api, onUnauthorized, request, pollTick]);

  return {
    patch: (update) =>
      setState((current) =>
        current.kind === "ready"
          ? { detail: update(current.detail), kind: "ready" }
          : current
      ),
    reload: () => setRequest(nextRequest),
    state,
  };
}
