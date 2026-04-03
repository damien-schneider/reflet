"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-500/10 text-amber-500",
  approved: "bg-green-500/10 text-green-500",
  published: "bg-blue-500/10 text-blue-500",
  rejected: "bg-red-500/10 text-red-500",
};

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  changelog_announce: "Changelog",
  email_campaign: "Email",
  hn_comment: "HN Comment",
  linkedin_post: "LinkedIn",
  reddit_reply: "Reddit",
  twitter_post: "Twitter",
};

export function GrowthItemsList({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const items = useQuery(api.autopilot.queries.listGrowthItems, {
    organizationId,
    limit: 50,
  });

  if (items === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-16 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No growth items yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div className="rounded-lg border p-3" key={item._id}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{item.title}</span>
            <div className="flex items-center gap-2">
              <Badge
                className={cn("text-xs", STATUS_STYLES[item.status])}
                variant="secondary"
              >
                {item.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline">
                {TYPE_LABELS[item.type] ?? item.type}
              </Badge>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {item.content}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
            <span>
              {formatDistanceToNow(item.createdAt, { addSuffix: true })}
            </span>
            {item.publishedUrl && (
              <a
                className="text-blue-500 underline"
                href={item.publishedUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                View published
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
