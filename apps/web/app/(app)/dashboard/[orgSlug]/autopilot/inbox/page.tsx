"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { InboxItemCard } from "@/features/autopilot/components/inbox-item-card";

export default function AutopilotInboxPage() {
  const { organizationId } = useAutopilotContext();

  const items = useQuery(api.autopilot.queries.listInboxItems, {
    organizationId,
    limit: 50,
  });

  const counts = useQuery(api.autopilot.queries.getInboxCounts, {
    organizationId,
  });

  const bulkUpdate = useMutation(api.autopilot.mutations.bulkUpdateInbox);

  if (items === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const pendingItems = items.filter((item) => item.status === "pending");

  const handleBulkApprove = async () => {
    const ids = pendingItems.map((item) => item._id);
    if (ids.length === 0) {
      return;
    }

    try {
      await bulkUpdate({ itemIds: ids, status: "approved" });
      toast.success(`Approved ${ids.length} items`);
    } catch {
      toast.error("Failed to approve items");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <H2 variant="card">Inbox</H2>
          {counts && counts.total > 0 && (
            <Badge variant="secondary">{counts.total} pending</Badge>
          )}
        </div>
        {pendingItems.length > 1 && (
          <Button onClick={handleBulkApprove} size="sm" variant="outline">
            Approve All ({pendingItems.length})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No inbox items yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxItemCard item={item} key={item._id} />
          ))}
        </div>
      )}
    </div>
  );
}
