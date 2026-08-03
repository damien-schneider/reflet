"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface CopyBlockProps {
  content: string;
  label?: string;
}

/** Scrollable code block with a copy button, for content too long to inline. */
function CopyBlock({ content, label }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, COPY_FEEDBACK_DURATION_MS);
  }, [content]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-border border-b px-4 py-2">
        <span className="font-medium text-muted-foreground text-xs">
          {label ?? "Prompt"}
        </span>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          )}
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export { CopyBlock };
