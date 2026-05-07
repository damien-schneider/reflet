import { InboxItemCard } from "@/features/autopilot/components/inbox-item-card";
import type { InboxItem, InboxStatusAction, InboxTab } from "./types";
import { getEmptyMessage } from "./use-inbox-keyboard";

interface InboxListProps {
  activeTab: InboxTab;
  filteredItems: InboxItem[] | undefined;
  isUpdatingItem: (itemId: string) => boolean;
  onOpen: (item: InboxItem) => void;
  onUpdateStatus: (
    item: InboxItem,
    status: InboxStatusAction
  ) => Promise<boolean>;
  searchQuery: string;
  selectedIndex: number;
}

export function InboxList({
  activeTab,
  filteredItems,
  isUpdatingItem,
  onOpen,
  onUpdateStatus,
  searchQuery,
  selectedIndex,
}: InboxListProps) {
  if (!filteredItems || filteredItems.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        {getEmptyMessage(searchQuery, activeTab)}
      </div>
    );
  }

  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {filteredItems.map((item, index) => {
        const showDivider =
          index > 0 &&
          item.createdAt < recentCutoff &&
          filteredItems[index - 1].createdAt >= recentCutoff;

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
              isUpdating={isUpdatingItem(item._id)}
              item={item}
              onApprove={(currentItem) =>
                onUpdateStatus(currentItem, "approved")
              }
              onClick={() => onOpen(item)}
              onReject={(currentItem) =>
                onUpdateStatus(currentItem, "rejected")
              }
              selected={index === selectedIndex}
            />
          </div>
        );
      })}
    </div>
  );
}
