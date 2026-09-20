"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  CaretDown,
  ClockCounterClockwise,
  GithubLogo,
  Lightning,
  X,
} from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import {
  GROUPING_OPTIONS,
  type GroupingStrategy,
} from "./retroactive-constants";

interface TriggerViewProps {
  error?: string;
  groupingStrategy: GroupingStrategy;
  isStarting: boolean;
  onDismiss: () => void;
  onStart: () => void;
  repoName?: string;
  setGroupingStrategy: (strategy: GroupingStrategy) => void;
  setSkipExisting: (skip: boolean) => void;
  skipExisting: boolean;
}

export function TriggerView({
  repoName,
  error,
  isStarting,
  onStart,
  onDismiss,
  groupingStrategy,
  setGroupingStrategy,
  skipExisting,
  setSkipExisting,
}: TriggerViewProps) {
  return (
    <div className="relative mb-6 rounded-xl border-2 border-muted-foreground/20 border-dashed p-8">
      <Tooltip>
        <TooltipTrigger
          aria-label="Dismiss"
          render={
            <Button
              className="absolute top-3 right-3"
              iconOnly
              onClick={onDismiss}
              size="md"
              variant="ghost"
            />
          }
        >
          <X className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Dismiss</TooltipContent>
      </Tooltip>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ClockCounterClockwise className="h-6 w-6 text-primary" />
        </div>

        <div>
          <h3 className="font-semibold text-lg">Generate your changelog</h3>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
            Import past releases from your git history. We&apos;ll create draft
            entries you can review before publishing.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-destructive-text text-sm">{error}</p>
          </div>
        )}

        {repoName && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GithubLogo className="h-4 w-4" />
            <span>{repoName}</span>
          </div>
        )}

        <Button
          disabled={isStarting}
          onClick={onStart}
          size="md"
          tone="primary"
          type="button"
          variant="solid"
        >
          {isStarting ? (
            <>
              <Spinner />
              Starting...
            </>
          ) : (
            <>
              <Lightning className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground">
            Options
            <CaretDown className="h-3 w-3 transition-transform group-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 flex w-full max-w-sm flex-col gap-3 text-left">
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-muted-foreground text-xs"
                  id="retroactive-grouping-label"
                >
                  Group by
                </span>
                <fieldset
                  aria-labelledby="retroactive-grouping-label"
                  className="inline-flex min-w-0 gap-1"
                >
                  {GROUPING_OPTIONS.map((option) => {
                    const selected = groupingStrategy === option.value;
                    return (
                      <Button
                        active={selected}
                        aria-pressed={selected}
                        key={option.value}
                        onClick={() => setGroupingStrategy(option.value)}
                        size="sm"
                        tone={selected ? "primary" : "neutral"}
                        type="button"
                        variant={selected ? "solid" : "ghost"}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </fieldset>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={skipExisting}
                  id="inline-skip-existing"
                  onCheckedChange={(checked) =>
                    setSkipExisting(Boolean(checked))
                  }
                />
                <Label
                  className="cursor-pointer text-xs"
                  htmlFor="inline-skip-existing"
                >
                  Skip existing versions
                </Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
