"use client";

import { ClockCounterClockwise, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RetroactiveDraftReview } from "./retroactive-draft-review";
import { RetroactiveScanConfig } from "./retroactive-scan-config";
import { RetroactiveScanProgress } from "./retroactive-scan-progress";

type Phase = "configure" | "progress" | "complete";

interface RetroactiveChangelogSheetProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function RetroactiveChangelogSheet({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
}: RetroactiveChangelogSheetProps) {
  const [phase, setPhase] = useState<Phase>("configure");
  const [_jobId, setJobId] = useState<Id<"retroactiveJobs"> | null>(null);

  const handleStart = (newJobId: Id<"retroactiveJobs">) => {
    setJobId(newJobId);
    setPhase("progress");
  };

  const handleComplete = () => {
    setPhase("complete");
  };

  const handleCancel = () => {
    setPhase("configure");
    setJobId(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPhase("configure");
      setJobId(null);
    }
    onOpenChange(nextOpen);
  };

  const phaseTitle: Record<Phase, string> = {
    configure: "Retroactive Changelog",
    progress: "Scanning History",
    complete: "Scan Complete",
  };

  const phaseDescription: Record<Phase, string> = {
    configure: "Generate changelog entries from your existing git history.",
    progress: "Analyzing your repository and generating draft releases...",
    complete: "Your draft releases are ready for review.",
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
        side="right"
        variant="panel"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="flex items-center gap-2">
              <ClockCounterClockwise className="h-5 w-5" />
              {phaseTitle[phase]}
            </SheetTitle>
            <SheetDescription>{phaseDescription[phase]}</SheetDescription>
          </div>
          <SheetClose
            render={
              <Button
                onClick={() => handleOpenChange(false)}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {phase === "configure" && (
              <RetroactiveScanConfig
                onStart={handleStart}
                organizationId={organizationId}
              />
            )}
            {phase === "progress" && (
              <RetroactiveScanProgress
                onCancel={handleCancel}
                onComplete={handleComplete}
                organizationId={organizationId}
              />
            )}
            {phase === "complete" && (
              <RetroactiveDraftReview
                organizationId={organizationId}
                orgSlug={orgSlug}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
