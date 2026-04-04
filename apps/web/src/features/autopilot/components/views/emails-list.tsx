"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-500/10 text-amber-500",
  approved: "bg-green-500/10 text-green-500",
  sent: "bg-blue-500/10 text-blue-500",
  received: "bg-cyan-500/10 text-cyan-500",
  rejected: "bg-red-500/10 text-red-500",
};

export function EmailsList({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const emails = useQuery(api.autopilot.queries.email.listEmails, {
    organizationId,
    limit: 50,
  });

  if (emails === undefined) {
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

  if (emails.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No emails yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => {
        const DirectionIcon =
          email.direction === "inbound" ? IconArrowDown : IconArrowUp;

        return (
          <div className="rounded-lg border p-3" key={email._id}>
            <div className="flex items-center gap-2">
              <DirectionIcon
                className={cn(
                  "size-4 shrink-0",
                  email.direction === "inbound"
                    ? "text-cyan-500"
                    : "text-blue-500"
                )}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-sm">
                {email.subject}
              </span>
              <Badge
                className={cn("text-xs", STATUS_STYLES[email.status])}
                variant="secondary"
              >
                {email.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
              <span>
                {email.direction === "inbound" ? "From" : "To"}:{" "}
                {email.direction === "inbound"
                  ? email.from
                  : email.to.join(", ")}
              </span>
              <span>
                {formatDistanceToNow(email.createdAt, { addSuffix: true })}
              </span>
              {email.draftedByAgent && (
                <Badge variant="outline">{email.draftedByAgent}</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
