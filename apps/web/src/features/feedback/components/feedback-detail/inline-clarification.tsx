"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

interface InlineClarificationProps {
  feedbackId: Id<"feedback">;
}

export function InlineClarification({ feedbackId }: InlineClarificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const status = useQuery(api.feedback.clarification.getClarificationStatus, {
    feedbackId,
  });

  const initiateClarification = useMutation(
    api.feedback.clarification.initiateClarification
  );

  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await initiateClarification({ feedbackId });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!status?.hasAiClarification) {
    return null;
  }

  const clarification = status.aiClarification ?? "";
  const firstLine = clarification.split("\n")[0] ?? "";
  const hasMore = clarification.includes("\n");

  return (
    <div className="rounded-lg border border-border bg-brand-subtle px-4 py-3">
      <div className="flex items-start gap-2">
        <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" />
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {isExpanded ? clarification : firstLine}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            {hasMore && (
              <Button
                className="h-auto p-0 text-brand-text text-xs"
                onClick={() => setIsExpanded((prev) => !prev)}
                variant="quiet"
              >
                {isExpanded ? (
                  <>
                    Show less <CaretUp className="ml-0.5 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show more <CaretDown className="ml-0.5 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
            <Button
              className="h-auto p-0 text-muted-foreground text-xs"
              disabled={isRegenerating}
              onClick={handleRegenerate}
              variant="quiet"
            >
              {isRegenerating ? (
                <>
                  <ArrowsClockwise className="mr-0.5 h-3 w-3 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
