"use client";

import { useEffect, useRef, useState } from "react";

const COPY_FEEDBACK_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

interface CopyFeedback {
  /** Rejects when the clipboard write fails, after setting state to "failed". */
  copy: (value: string) => Promise<void>;
  state: CopyState;
}

function useCopyFeedback(): CopyFeedback {
  const [state, setState] = useState<CopyState>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showState = (next: CopyState) => {
    setState(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState("idle"), COPY_FEEDBACK_MS);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      showState("failed");
      throw error;
    }
    showState("copied");
  };

  return { copy, state };
}

export type { CopyState };
export { useCopyFeedback };
