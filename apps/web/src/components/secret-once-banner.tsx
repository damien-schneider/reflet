"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Copy, Warning } from "@phosphor-icons/react";

interface SecretOnceBannerProps {
  onCopy: () => void;
  onDismiss: () => void;
  secret: string;
  title: string;
}

export function SecretOnceBanner({
  onCopy,
  onDismiss,
  secret,
  title,
}: SecretOnceBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-amber-800 dark:text-amber-200">
            {title}
          </h2>
          <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
            This is the only time it will be shown.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
              {secret}
            </code>
            <Button
              aria-label="Copy secret"
              iconOnly
              onClick={onCopy}
              variant="surface"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="mt-3"
            onClick={onDismiss}
            size="xs"
            variant="ghost"
          >
            I&apos;ve saved it
          </Button>
        </div>
      </div>
    </div>
  );
}
