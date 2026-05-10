"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskDetailContent } from "@/features/autopilot/components/tasks/task-detail-content";

export function TaskDetailSheet({
  workItemId,
  open,
  onOpenChange,
}: {
  workItemId: Id<"autopilotWorkItems"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-[760px]"
        side="right"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Task details</SheetTitle>
          <SheetDescription>
            Quick peek view for the selected task.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pt-6 pb-12">
          {workItemId ? <TaskDetailContent workItemId={workItemId} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
