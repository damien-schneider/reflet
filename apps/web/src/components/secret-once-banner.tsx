"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Warning } from "@phosphor-icons/react";

import { CopyButton } from "@/components/copy-button";

interface SecretOnceBannerProps {
  onDismiss: () => void;
  secret: string;
  title: string;
}

export function SecretOnceBanner({
  onDismiss,
  secret,
  title,
}: SecretOnceBannerProps) {
  return (
    <div className="rounded-lg border border-border bg-warning-subtle p-4">
      <div className="flex items-start gap-3">
        <Warning
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-warning-text"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-warning-text">{title}</h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm">
            Copy it now. You won’t be able to see it again.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all overflow-x-auto rounded bg-background px-3 py-2 font-mono text-sm">
              {secret}
            </code>
            <CopyButton
              label="Copy secret"
              size="md"
              value={secret}
              variant="surface"
            />
          </div>
          <Button
            className="mt-3"
            onClick={onDismiss}
            size="xs"
            variant="ghost"
          >
            I’ve saved it
          </Button>
        </div>
      </div>
    </div>
  );
}
