"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface InstallCommandProps {
  command: string;
}

const COPY_FEEDBACK_DURATION_MS = 2000;

function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, COPY_FEEDBACK_DURATION_MS);
  }, [command]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
      <code className="flex-1 overflow-x-auto text-foreground text-sm">
        {command}
      </code>
      <button
        aria-label={
          copied ? "Copied to clipboard" : "Copy command to clipboard"
        }
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          copied
            ? "text-green-600 dark:text-green-400"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <Check className="size-4" weight="bold" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  );
}

export { InstallCommand };
