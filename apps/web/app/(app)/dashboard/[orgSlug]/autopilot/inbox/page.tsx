"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DocumentSheet } from "@/features/autopilot/components/document-sheet";
import {
  InboxFilters,
  InboxHeader,
} from "@/features/autopilot/components/inbox/inbox-controls";
import { InboxList } from "@/features/autopilot/components/inbox/inbox-list";
import {
  type InboxPageState,
  initialInboxPageState,
  reduceInboxPageState,
} from "@/features/autopilot/components/inbox/page-state";
import type {
  InboxItem,
  InboxTab,
} from "@/features/autopilot/components/inbox/types";
import { useInboxKeyboard } from "@/features/autopilot/components/inbox/use-inbox-keyboard";
import { ReportSheet } from "@/features/autopilot/components/report-sheet";
import { getAutopilotErrorMessage } from "@/features/autopilot/lib/error-messages";

export default function AutopilotInboxPage() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const { push } = useRouter();
  const [pageState, dispatchPageState] = useReducer(
    reduceInboxPageState,
    initialInboxPageState
  );
  const {
    activeTab,
    detailDocId,
    detailReportId,
    pendingItemIds,
    searchQuery,
    selectedIndex,
  } = pageState;
  const updatePageState = (state: Partial<InboxPageState>) => {
    dispatchPageState({ kind: "patch", state });
  };

  const items = useQuery(api.autopilot.queries.inbox.listInboxItems, {
    organizationId,
    limit: 50,
    reviewState: activeTab,
  });

  const counts = useQuery(api.autopilot.queries.inbox.getInboxCounts, {
    organizationId,
  });

  const detailDocument = useQuery(
    api.autopilot.queries.documents.getDocument,
    detailDocId ? { documentId: detailDocId } : "skip"
  );
  const detailReport = useQuery(
    api.autopilot.queries.reports.getReport,
    detailReportId ? { reportId: detailReportId } : "skip"
  );

  const approveWork = useMutation(
    api.autopilot.mutations.inbox.approveWorkItem
  );
  const rejectWork = useMutation(api.autopilot.mutations.inbox.rejectWorkItem);
  const approveDoc = useMutation(api.autopilot.mutations.inbox.approveDocument);
  const rejectDoc = useMutation(api.autopilot.mutations.inbox.rejectDocument);
  const acknowledgeReport = useMutation(
    api.autopilot.mutations.reports.acknowledgeReport
  );

  const isUpdatingItem = (itemId: string) => pendingItemIds.includes(itemId);

  const approveItem = async (item: InboxItem) => {
    if (item._source === "work") {
      await approveWork({ workItemId: item._id });
      return;
    }
    if (item._source === "document") {
      await approveDoc({ documentId: item._id });
      return;
    }
    await acknowledgeReport({ reportId: item._id });
  };

  const rejectItem = async (item: InboxItem) => {
    if (item._source === "work") {
      await rejectWork({ workItemId: item._id });
      return;
    }
    if (item._source === "document") {
      await rejectDoc({ documentId: item._id });
    }
  };

  const updateStatus = async (
    item: InboxItem,
    status: "approved" | "rejected",
    showToast = true
  ): Promise<boolean> => {
    if (isUpdatingItem(item._id)) {
      return false;
    }

    dispatchPageState({ itemId: item._id, kind: "addPendingItem" });
    try {
      if (status === "approved") {
        await approveItem(item);
      } else {
        await rejectItem(item);
      }
      if (showToast) {
        toast.success(status === "approved" ? "Approved" : "Dismissed");
      }
      return true;
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, {
          fallback: "Failed to update item",
        })
      );
      return false;
    } finally {
      dispatchPageState({ itemId: item._id, kind: "removePendingItem" });
    }
  };

  const openDetail = (item: InboxItem) => {
    if (item._source === "document") {
      updatePageState({ detailDocId: item._id });
      return;
    }
    if (item._source === "report") {
      updatePageState({ detailReportId: item._id });
      return;
    }
    push(`/dashboard/${orgSlug}/autopilot/tasks/${item._id}`);
  };

  const filteredItems = items?.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  useEffect(
    function clampSelectedInboxIndex() {
      if (filteredItems === undefined || filteredItems.length === 0) {
        dispatchPageState({ kind: "setSelectedIndex", update: 0 });
        return;
      }
      if (selectedIndex >= filteredItems.length) {
        dispatchPageState({
          kind: "setSelectedIndex",
          update: filteredItems.length - 1,
        });
      }
    },
    [filteredItems, selectedIndex]
  );

  useInboxKeyboard({
    dispatchSelectedIndex: dispatchPageState,
    filteredItems,
    openDetail,
    selectedIndex,
  });

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

  const visiblePendingItems =
    activeTab === "pending"
      ? (filteredItems?.filter((item) => item.needsReview) ?? [])
      : [];

  const handleBulkApprove = async () => {
    const readyItems = visiblePendingItems.filter(
      (item) => !isUpdatingItem(item._id)
    );
    if (readyItems.length === 0) {
      return;
    }

    const results = await Promise.all(
      readyItems.map((item) => updateStatus(item, "approved", false))
    );
    const approvedCount = results.filter(Boolean).length;
    if (approvedCount > 0) {
      toast.success(`Approved ${approvedCount} items`);
    }
    if (approvedCount < readyItems.length) {
      toast.error("Some inbox items could not be approved");
    }
  };

  const handleTabChange = (tab: InboxTab) => {
    updatePageState({ activeTab: tab, selectedIndex: 0 });
  };

  const handleSearchChange = (query: string) => {
    updatePageState({ searchQuery: query, selectedIndex: 0 });
  };

  return (
    <div className="space-y-6">
      <InboxHeader
        countsTotal={counts?.total}
        onBulkApprove={handleBulkApprove}
        pendingCount={visiblePendingItems.length}
      />

      <InboxFilters
        activeTab={activeTab}
        countsTotal={counts?.total}
        onSearchChange={handleSearchChange}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
      />

      <InboxList
        activeTab={activeTab}
        filteredItems={filteredItems}
        isUpdatingItem={isUpdatingItem}
        onOpen={openDetail}
        onUpdateStatus={updateStatus}
        searchQuery={searchQuery}
        selectedIndex={selectedIndex}
      />

      <DocumentSheet
        document={detailDocument ?? null}
        mode="view"
        onOpenChange={(open) => {
          if (!open) {
            updatePageState({ detailDocId: null });
          }
        }}
        open={detailDocId !== null}
        organizationId={organizationId}
      />
      <ReportSheet
        onOpenChange={(open) => {
          if (!open) {
            updatePageState({ detailReportId: null });
          }
        }}
        open={detailReportId !== null}
        report={detailReport ?? null}
      />
    </div>
  );
}
