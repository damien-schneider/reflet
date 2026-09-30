import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CheckCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const SKELETON_CARD_KEYS = ["a", "b", "c"] as const;

export function ReviewQueueSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-7 w-44" />
      {SKELETON_CARD_KEYS.map((key) => (
        <Skeleton className="h-40" key={key} />
      ))}
    </div>
  );
}

export function ReviewSectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <h2 className="flex items-baseline gap-2 font-semibold text-heading-4">
        {title}
        {count !== undefined && (
          <span className="font-normal text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

export function AllCaughtUp({ description }: { description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <CheckCircle aria-hidden className="size-6 text-success" />
        </EmptyMedia>
        <EmptyTitle>All caught up</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function StatusAnnouncer({ message }: { message: string }) {
  return (
    <p aria-live="polite" className="sr-only" role="status">
      {message}
    </p>
  );
}
