import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { LockSimple } from "@phosphor-icons/react";

const SKELETON_ROWS = ["a", "b", "c", "d"] as const;

function FeedCardSkeleton() {
  return (
    <div className="relative rounded-xl border border-border/50 bg-card">
      <div className="space-y-3 px-4 pt-4 pr-20">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
      <div className="mt-3 border-border/30 border-t px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="absolute top-0 right-0 h-8 w-20 rounded-tr-xl rounded-bl-xl" />
    </div>
  );
}

export function LoadingState() {
  return (
    <div aria-busy="true" className="mx-auto max-w-3xl px-4 py-6">
      <span className="sr-only" role="status">
        Loading feedback…
      </span>
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mb-4 h-16 w-full rounded-xl" />
      <div className="space-y-4">
        {SKELETON_ROWS.map((id) => (
          <FeedCardSkeleton key={id} />
        ))}
      </div>
    </div>
  );
}

export function PrivateOrgMessage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <LockSimple aria-hidden className="size-6" />
          </EmptyMedia>
          <EmptyTitle>This board is private</EmptyTitle>
          <EmptyDescription>
            Only members of this organization can see its feedback.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
