"use client";

import { useEffect, useRef, useState } from "react";

const COPY_FEEDBACK_MS = 2000;

interface CopyFeedback {
  copied: boolean;
  copy: (value: string) => Promise<void>;
}

function useCopyFeedback(): CopyFeedback {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return { copied, copy };
}

export type { CopyFeedback };
export { useCopyFeedback };
