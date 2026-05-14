import { Skeleton } from "@/components/ui/skeleton";

export function TaskDetailSkeleton() {
  return (
    <div className="space-y-6 p-10">
      <Skeleton className="h-4 w-48" data-testid="task-detail-skeleton" />
      <Skeleton className="h-8 w-3/4" data-testid="task-detail-skeleton" />
      <Skeleton className="h-24 w-full" data-testid="task-detail-skeleton" />
      <Skeleton className="h-40 w-full" data-testid="task-detail-skeleton" />
    </div>
  );
}
