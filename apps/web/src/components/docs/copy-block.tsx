"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Copy } from "@phosphor-icons/react";

import { useCopyFeedback } from "./use-copy-feedback";

interface CopyBlockProps {
  content: string;
  label?: string;
}

function CopyBlock({ content, label }: CopyBlockProps) {
  const { copied, copy } = useCopyFeedback();
  const heading = label ?? "Prompt";
  const action = copied ? "Copied" : `Copy ${heading.toLowerCase()}`;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-border border-b py-1 pr-1 pl-4">
        <span className="font-medium text-muted-foreground text-xs">
          {heading}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={action}
                className="h-10 gap-1.5 px-3 text-xs"
                onClick={() => copy(content)}
                size="sm"
                variant="ghost"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success-text" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            }
          />
          <TooltipContent>{action}</TooltipContent>
        </Tooltip>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export { CopyBlock };
