"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
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
    <div className="rounded-lg border border-border bg-warning-subtle p-4">
      <div className="flex items-start gap-3">
        <Warning className="mt-0.5 size-5 shrink-0 text-warning-text" />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-warning-text">{title}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            This is the only time it will be shown.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded bg-background px-3 py-2 font-mono text-sm">
              {secret}
            </code>
            <Tooltip>
              <TooltipTrigger
                aria-label="Copy secret"
                render={
                  <Button
                    className="size-10"
                    iconOnly
                    onClick={onCopy}
                    variant="surface"
                  />
                }
              >
                <Copy className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Copy secret</TooltipContent>
            </Tooltip>
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
