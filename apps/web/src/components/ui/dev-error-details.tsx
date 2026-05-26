"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { isDevEnv, serializeError } from "@/lib/dev-error";
import { cn } from "@/lib/utils";

interface DevErrorDetailsProps {
  className?: string;
  error: unknown;
}

const COPY_RESET_MS = 1500;

export function DevErrorDetails({ className, error }: DevErrorDetailsProps) {
  const [copied, setCopied] = useState(false);

  const payload = serializeError(error);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("Error copied to clipboard");
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error("Failed to copy");
    }
  }, [payload]);

  if (!isDevEnv()) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative mt-4 w-full max-w-2xl overflow-hidden rounded-md border border-destructive/30 bg-muted text-left",
        className
      )}
    >
      <button
        aria-label="Copy error details"
        className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-foreground"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <Check className="size-3.5" weight="bold" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <pre className="max-h-72 overflow-auto p-3 pr-12 text-xs leading-relaxed text-muted-foreground">
        {payload}
      </pre>
    </div>
  );
}
