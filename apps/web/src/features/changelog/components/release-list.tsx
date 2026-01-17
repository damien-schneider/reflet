import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReleaseCard } from "@/features/changelog/components/release-card";
import { cn } from "@/lib/utils";

interface ReleaseListProps {
  organizationId: Id<"organizations">;
  className?: string;
  publishedOnly?: boolean;
  onReleaseClick?: (releaseId: Id<"releases">) => void;
}

export function ReleaseList({
  organizationId,
  className,
  publishedOnly = true,
  onReleaseClick,
}: ReleaseListProps) {
  const releases = useQuery(
    publishedOnly ? api.changelog.listPublished : api.changelog.list,
    { organizationId, ...(publishedOnly ? {} : { publishedOnly: false }) }
  );

  const isLoading = releases === undefined;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div className="rounded-lg border p-6" key={i}>
              <Skeleton className="mb-4 h-6 w-24" />
              <Skeleton className="mb-2 h-7 w-3/4" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && releases?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No releases published yet. Check back later!
          </p>
        </div>
      )}

      {/* Release list */}
      {!isLoading && releases && releases.length > 0 && (
        <div className="space-y-6">
          {releases.map((release: Doc<"releases">) => (
            <ReleaseCard
              key={release._id}
              onClick={onReleaseClick}
              release={release}
            />
          ))}
        </div>
      )}
    </div>
  );
}
