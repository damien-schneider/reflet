"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/typography";

interface GitHubRelease {
  _id: string;
  isDraft: boolean;
  isPrerelease: boolean;
  name?: string;
  refletReleaseId?: string;
  tagName: string;
}

interface SyncedReleasesCardProps {
  releases: GitHubRelease[];
}

export function SyncedReleasesSection({ releases }: SyncedReleasesCardProps) {
  if (releases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {releases.slice(0, 5).map((release) => (
        <div
          className="flex items-center justify-between rounded-lg border p-3"
          key={release._id}
        >
          <div>
            <Text className="font-medium">
              {release.name || release.tagName}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {release.tagName}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {release.isDraft ? <Badge variant="outline">Draft</Badge> : null}
            {release.isPrerelease ? (
              <Badge variant="outline">Pre-release</Badge>
            ) : null}
            {release.refletReleaseId ? (
              <Badge variant="secondary">Imported</Badge>
            ) : null}
          </div>
        </div>
      ))}
      {releases.length > 5 ? (
        <Text className="text-center text-muted-foreground text-sm">
          +{releases.length - 5} more
        </Text>
      ) : null}
    </div>
  );
}
