import {
  CaretDown,
  ClockCounterClockwise,
  GithubLogo,
  Lightning,
  Spinner,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import type { GroupingStrategy } from "@/features/changelog/components/retroactive-constants";
import { GROUPING_OPTIONS } from "@/features/changelog/components/retroactive-constants";
import { cn } from "@/lib/utils";

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
      <button
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

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
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {repoName && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GithubLogo className="h-4 w-4" />
            <span>{repoName}</span>
          </div>
        )}

        <Button disabled={isStarting} onClick={onStart} size="lg" type="button">
          {isStarting ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" />
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
                <Label className="text-muted-foreground text-xs">
                  Group by
                </Label>
                <div className="inline-flex rounded-md border">
                  {GROUPING_OPTIONS.map((option) => (
                    <button
                      className={cn(
                        "px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                        groupingStrategy === option.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      key={option.value}
                      onClick={() => setGroupingStrategy(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
