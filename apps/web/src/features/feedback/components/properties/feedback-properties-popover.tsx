"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { lazy, Suspense, useState } from "react";

const FeedbackMetadataBar = lazy(() =>
  import(
    "@/features/feedback/components/feedback-detail/feedback-metadata-bar"
  ).then((module) => ({ default: module.FeedbackMetadataBar }))
);

function LoadedProperties({ feedbackId }: { feedbackId: Id<"feedback"> }) {
  const feedback = useQuery(api.feedback.queries.get, { id: feedbackId });
  if (feedback === undefined) {
    return (
      <p className="p-3 text-muted-foreground text-sm" role="status">
        Loading properties…
      </p>
    );
  }
  if (!feedback) {
    return (
      <p className="p-3 text-muted-foreground text-sm">
        Feedback is unavailable.
      </p>
    );
  }
  return (
    <Suspense fallback={<p role="status">Loading properties…</p>}>
      <FeedbackMetadataBar
        feedback={feedback}
        isAdmin={feedback.role === "admin" || feedback.role === "owner"}
      />
    </Suspense>
  );
}

export function FeedbackPropertiesPopover({
  feedbackId,
}: {
  feedbackId: Id<"feedback">;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={<Button className="relative z-10" size="xs" variant="ghost" />}
      >
        Properties
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-96 max-w-[calc(100vw-2rem)] p-0"
        onClick={(event) => event.stopPropagation()}
      >
        {open && <LoadedProperties feedbackId={feedbackId} />}
      </PopoverContent>
    </Popover>
  );
}
