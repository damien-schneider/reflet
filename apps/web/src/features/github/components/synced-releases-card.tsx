"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Text } from "@/components/ui/typography";

const VISIBLE_RELEASES = 5;

interface GitHubRelease {
  _id: string;
  isDraft: boolean;
  isPrerelease: boolean;
  name?: string;
  refletReleaseId?: string;
  tagName: string;
}

interface SyncedReleasesCardProps {
  releases: GitHubRelease[] | undefined;
}

const SKELETON_ROWS = ["a", "b", "c"] as const;

export function SyncedReleasesSection({ releases }: SyncedReleasesCardProps) {
  if (releases === undefined) {
    return (
      <ul aria-busy="true" aria-label="Loading releases" className="space-y-2">
        {SKELETON_ROWS.map((row) => (
          <li className="flex flex-col gap-1.5 rounded-lg border p-3" key={row}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-20" />
          </li>
        ))}
      </ul>
    );
  }

  if (releases.length === 0) {
    return (
      <Text className="text-pretty text-muted-foreground" variant="bodySmall">
        No releases synced yet. Publish a release on GitHub or sync now to
        import it.
      </Text>
    );
  }

  const hiddenCount = releases.length - VISIBLE_RELEASES;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {releases.slice(0, VISIBLE_RELEASES).map((release) => {
          const title = release.name || release.tagName;
          return (
            <li
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
              key={release._id}
            >
              <div className="min-w-0">
                <Text className="truncate font-medium" title={title}>
                  {title}
                </Text>
                <Text
                  className="truncate text-muted-foreground"
                  title={release.tagName}
                  variant="bodySmall"
                >
                  {release.tagName}
                </Text>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {release.isDraft ? (
                  <Badge size="sm" variant="outline">
                    Draft
                  </Badge>
                ) : null}
                {release.isPrerelease ? (
                  <Badge size="sm" variant="outline">
                    Pre-release
                  </Badge>
                ) : null}
                {release.refletReleaseId ? (
                  <Badge size="sm">Imported</Badge>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <Text
          className="text-center text-muted-foreground tabular-nums"
          variant="bodySmall"
        >
          {hiddenCount} more {hiddenCount === 1 ? "release" : "releases"}
        </Text>
      ) : null}
    </div>
  );
}
