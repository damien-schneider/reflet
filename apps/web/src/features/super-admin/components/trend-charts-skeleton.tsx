import { Skeleton } from "@ctrl-ui/react/ui/skeleton";

export function TrendChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-80 rounded-(--radius-panel)" />
      <Skeleton className="h-80 rounded-(--radius-panel)" />
    </div>
  );
}
