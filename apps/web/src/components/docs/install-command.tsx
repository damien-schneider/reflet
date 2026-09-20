"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Copy } from "@phosphor-icons/react";

import { useCopyFeedback } from "./use-copy-feedback";

interface InstallCommandProps {
  command: string;
}

function InstallCommand({ command }: InstallCommandProps) {
  const { copied, copy } = useCopyFeedback();
  const label = copied ? "Copied to clipboard" : "Copy command to clipboard";

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted py-1.5 pr-1.5 pl-4">
      <code className="flex-1 overflow-x-auto text-foreground text-sm">
        {command}
      </code>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={label}
              className={copied ? "size-10 text-success-text" : "size-10"}
              iconOnly
              onClick={() => copy(command)}
              size="sm"
              variant="ghost"
            >
              {copied ? (
                <Check className="size-4" weight="bold" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export { InstallCommand };
