"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DocumentSheet } from "@/features/autopilot/components/document-sheet";
import { InboxItemCard } from "@/features/autopilot/components/inbox-item-card";
import { cn } from "@/lib/utils";

type Tab = "pending" | "resolved";

// Unified inbox item shape from work items + documents
interface InboxItem {
  _id: string;
  _source: "work" | "document";
  assignedAgent?: string;
  content?: string;
  createdAt: number;
  description?: string;
  needsReview: boolean;
  platform?: string;
  priority?: string;
  prUrl?: string;
  readAt?: number;
  reviewType?: string;
  sourceAgent?: string;
  status: string;
  targetUrl?: string;
  title: string;
  type?: string;
  updatedAt: number;
}

function getEmptyMessage(search: string, tab: Tab): string {
  if (search) {
    return "No matching items";
  }
  if (tab === "pending") {
    return "Inbox zero.";
  }
  return "No resolved items";
}

function handleInboxAction(
  key: string,
  items: InboxItem[],
  selectedIndex: number,
  setSelectedIndex: (fn: (prev: number) => number) => void,
  updateStatus: (args: {
    itemId: InboxItem["_id"];
    status: "approved" | "rejected";
  }) => Promise<unknown>,
  markRead: (args: { itemId: InboxItem["_id"] }) => Promise<unknown>,
  openDetail: (item: InboxItem) => void
): boolean {
  const item = items[selectedIndex];
  switch (key) {
    case "j": {
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      return true;
    }
    case "k": {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }
    case "a": {
      if (item?.needsReview) {
        updateStatus({ itemId: item._id, status: "approved" })
          .then(() => toast.success("Approved"))
          .catch(() => toast.error("Failed"));
      }
      return true;
    }
    case "y": {
      if (item?.needsReview) {
        updateStatus({ itemId: item._id, status: "rejected" })
          .then(() => toast.success("Dismissed"))
          .catch(() => toast.error("Failed"));
      }
      return true;
    }
    case "r": {
      if (item && !item.readAt) {
        markRead({ itemId: item._id }).catch(() =>
          toast.error("Failed to mark read")
        );
      }
      return true;
    }
    case "Enter": {
      if (item) {
        openDetail(item);
      }
      return true;
    }
    default:
      return false;
  }
}

function useInboxKeyboard(
  filteredItems: InboxItem[] | undefined,
  selectedIndex: number,
  setSelectedIndex: (fn: (prev: number) => number) => void,
  updateStatus: (args: {
    itemId: InboxItem["_id"];
    status: "approved" | "rejected";
  }) => Promise<unknown>,
  markRead: (args: { itemId: InboxItem["_id"] }) => Promise<unknown>,
  openDetail: (item: InboxItem) => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isTextInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (isTextInput || !filteredItems || filteredItems.length === 0) {
        return;
      }

      const handled = handleInboxAction(
        e.key,
        filteredItems,
        selectedIndex,
        setSelectedIndex,
        updateStatus,
        markRead,
        openDetail
      );
      if (handled) {
        e.preventDefault();
      }
    },
    [
      filteredItems,
      selectedIndex,
      setSelectedIndex,
      updateStatus,
      markRead,
      openDetail,
    ]
  );

  useEffect(
    function bindKeyboardNavigation() {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
    [handleKeyDown]
  );
}

export default function AutopilotInboxPage() {
  const { organizationId } = useAutopilotContext();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailDocId, setDetailDocId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useQuery(api.autopilot.queries.inbox.listInboxItems, {
    organizationId,
    limit: 50,
  });

  const counts = useQuery(api.autopilot.queries.inbox.getInboxCounts, {
    organizationId,
  });

  // Fetch the full document when detail panel is open
  const detailDocument = useQuery(
    api.autopilot.queries.documents.getDocument,
    detailDocId
      ? { documentId: detailDocId as Id<"autopilotDocuments"> }
      : "skip"
  );

  const approveWork = useMutation(
    api.autopilot.mutations.inbox.approveWorkItem
  );
  const rejectWork = useMutation(api.autopilot.mutations.inbox.rejectWorkItem);
  const approveDoc = useMutation(api.autopilot.mutations.inbox.approveDocument);
  const rejectDoc = useMutation(api.autopilot.mutations.inbox.rejectDocument);

  const approveItem = async (item: InboxItem) => {
    if (item._source === "work") {
      await approveWork({ workItemId: item._id as never });
    } else {
      await approveDoc({ documentId: item._id as never });
    }
  };

  const rejectItem = async (item: InboxItem) => {
    if (item._source === "work") {
      await rejectWork({ workItemId: item._id as never });
    } else {
      await rejectDoc({ documentId: item._id as never });
    }
  };

  // Adapter for keyboard hooks
  const updateStatus = async (args: {
    itemId: string;
    status: "approved" | "rejected";
  }) => {
    const item = items?.find((i) => i._id === args.itemId);
    if (!item) {
      return;
    }
    if (args.status === "approved") {
      await approveItem(item as InboxItem);
    } else {
      await rejectItem(item as InboxItem);
    }
  };

  const markRead = async (_args: { itemId: string }) => {
    // no-op
  };

  const openDetail = useCallback((item: InboxItem) => {
    if (item._source === "document") {
      setDetailDocId(item._id);
    } else if (item.prUrl) {
      window.open(item.prUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const filteredItems = items?.filter((item) => {
    const matchesTab =
      activeTab === "pending" ? item.needsReview : !item.needsReview;
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  }) as InboxItem[] | undefined;

  // Reset selection when filter changes
  useEffect(function resetSelectionOnFilterChange() {
    setSelectedIndex(0);
  }, []);

  useInboxKeyboard(
    filteredItems,
    selectedIndex,
    setSelectedIndex,
    updateStatus,
    markRead,
    openDetail
  );

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

  const pendingItems = items.filter((item) => item.needsReview);

  const handleBulkApprove = async () => {
    if (pendingItems.length === 0) {
      return;
    }

    try {
      for (const item of pendingItems) {
        await approveItem(item as InboxItem);
      }
      toast.success(`Approved ${pendingItems.length} items`);
    } catch {
      toast.error("Failed to approve items");
    }
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <H2 variant="card">Inbox</H2>
          {counts && counts.total > 0 && (
            <Badge variant="secondary">{counts.total} pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingItems.length > 1 && (
            <Button onClick={handleBulkApprove} size="sm" variant="outline">
              Approve All ({pendingItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-md border">
          <Button
            className={cn(
              "rounded-none rounded-l-md",
              activeTab === "pending" && "bg-muted"
            )}
            onClick={() => setActiveTab("pending")}
            size="sm"
            variant="ghost"
          >
            Pending
            {pendingItems.length > 0 && (
              <Badge className="ml-1.5" variant="secondary">
                {pendingItems.length}
              </Badge>
            )}
          </Button>
          <Button
            className={cn(
              "rounded-none rounded-r-md",
              activeTab === "resolved" && "bg-muted"
            )}
            onClick={() => setActiveTab("resolved")}
            size="sm"
            variant="ghost"
          >
            Resolved
          </Button>
        </div>
        <Input
          className="max-w-xs"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search inbox..."
          type="search"
          value={searchQuery}
        />
        <span className="hidden text-muted-foreground text-xs sm:inline">
          <kbd className="rounded border px-1 font-mono text-[10px]">j</kbd>
          <kbd className="ml-0.5 rounded border px-1 font-mono text-[10px]">
            k
          </kbd>{" "}
          navigate{" "}
          <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">
            a
          </kbd>{" "}
          approve{" "}
          <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">
            y
          </kbd>{" "}
          dismiss{" "}
          <kbd className="ml-1 rounded border px-1 font-mono text-[10px]">
            ↵
          </kbd>{" "}
          open
        </span>
      </div>

      {!filteredItems || filteredItems.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          {getEmptyMessage(searchQuery, activeTab)}
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border bg-card"
          ref={containerRef}
        >
          {filteredItems.map((item, index) => {
            const todayCutoff = Date.now() - 24 * 60 * 60 * 1000;
            const showDivider =
              index > 0 &&
              item.createdAt < todayCutoff &&
              filteredItems[index - 1].createdAt >= todayCutoff;

            return (
              <div key={item._id}>
                {showDivider && (
                  <div className="flex items-center gap-3 px-4 py-1.5">
                    <div className="flex-1 border-border border-t" />
                    <span className="shrink-0 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                      Earlier
                    </span>
                    <div className="flex-1 border-border border-t" />
                  </div>
                )}
                <InboxItemCard
                  item={item}
                  onClick={() => openDetail(item)}
                  onMarkRead={() => markRead({ itemId: item._id })}
                  selected={index === selectedIndex}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Document detail sheet — opens when clicking a document inbox item */}
      <DocumentSheet
        document={detailDocument ?? null}
        mode="view"
        onOpenChange={(open) => {
          if (!open) {
            setDetailDocId(null);
          }
        }}
        open={detailDocId !== null}
        organizationId={organizationId}
      />
    </div>
  );
}
