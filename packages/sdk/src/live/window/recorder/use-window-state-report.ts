import { useEffect, useState } from "react";
import {
  LIVE_HUB_ENDPOINTS,
  type LiveWindowState,
  liveStatusSchema,
} from "../../protocol";
import { callHub } from "../hub-link/hub-client";

const ACTIVATING_EVENTS = ["pointerdown", "pointerup", "keydown", "click"];

export function hasUserActivation(): boolean {
  return navigator.userActivation?.hasBeenActive ?? false;
}

export function useUserActivation(): boolean {
  const [isActive, setIsActive] = useState(hasUserActivation);

  useEffect(() => {
    if (isActive) {
      return;
    }
    const check = () => setIsActive(hasUserActivation());
    for (const type of ACTIVATING_EVENTS) {
      window.addEventListener(type, check, true);
    }
    return () => {
      for (const type of ACTIVATING_EVENTS) {
        window.removeEventListener(type, check, true);
      }
    };
  }, [isActive]);

  return isActive;
}

const RETRY_AFTER_MS = 1000;

interface ReportQueue {
  inFlight: boolean;
  latest: LiveWindowState | null;
  retry: ReturnType<typeof setTimeout> | undefined;
  unsent: boolean;
}

function flush(queue: ReportQueue): void {
  const { latest } = queue;
  if (queue.inFlight || !latest) {
    return;
  }
  queue.inFlight = true;
  queue.unsent = false;
  callHub(LIVE_HUB_ENDPOINTS.windowState, liveStatusSchema, latest).then(
    () => {
      queue.inFlight = false;
      if (queue.unsent) {
        flush(queue);
      }
    },
    () => {
      queue.inFlight = false;
      queue.unsent = true;
      queue.retry = setTimeout(() => flush(queue), RETRY_AFTER_MS);
    }
  );
}

export function useWindowStateReport(
  state: LiveWindowState,
  epoch: number
): void {
  const {
    canStart,
    limits,
    pauseReason,
    pendingUploads,
    phase,
    sessionId,
    startedAt,
  } = state;
  const [queue] = useState<ReportQueue>(() => ({
    inFlight: false,
    latest: null,
    retry: undefined,
    unsent: false,
  }));

  useEffect(
    () => () => {
      clearTimeout(queue.retry);
      queue.latest = null;
    },
    [queue]
  );

  useEffect(() => {
    if (epoch === 0) {
      return;
    }
    clearTimeout(queue.retry);
    queue.latest = {
      canStart,
      limits,
      pauseReason,
      pendingUploads,
      phase,
      sessionId,
      startedAt,
    };
    queue.unsent = true;
    flush(queue);
  }, [
    canStart,
    epoch,
    limits,
    pauseReason,
    pendingUploads,
    phase,
    sessionId,
    startedAt,
    queue,
  ]);
}
