import { useEffect } from "react";
import type {
  InboxItem,
  InboxStatusAction,
  InboxTab,
  SelectedIndexAction,
} from "./types";

interface InboxActionOptions {
  dispatchSelectedIndex: (action: SelectedIndexAction) => void;
  isUpdatingItem: (itemId: string) => boolean;
  items: InboxItem[];
  key: string;
  openDetail: (item: InboxItem) => void;
  selectedIndex: number;
  updateStatus: (
    item: InboxItem,
    status: InboxStatusAction
  ) => Promise<unknown>;
}

interface UseInboxKeyboardOptions {
  dispatchSelectedIndex: (action: SelectedIndexAction) => void;
  filteredItems: InboxItem[] | undefined;
  isUpdatingItem: (itemId: string) => boolean;
  openDetail: (item: InboxItem) => void;
  selectedIndex: number;
  updateStatus: (
    item: InboxItem,
    status: InboxStatusAction
  ) => Promise<unknown>;
}

export function getEmptyMessage(search: string, tab: InboxTab): string {
  if (search) {
    return "No matching items";
  }
  if (tab === "pending") {
    return "Inbox zero.";
  }
  return "No resolved items";
}

async function handleInboxAction({
  dispatchSelectedIndex,
  isUpdatingItem,
  items,
  key,
  openDetail,
  selectedIndex,
  updateStatus,
}: InboxActionOptions): Promise<boolean> {
  const item = items[selectedIndex];
  switch (key) {
    case "j": {
      dispatchSelectedIndex({
        kind: "setSelectedIndex",
        update: (previous) => Math.min(previous + 1, items.length - 1),
      });
      return true;
    }
    case "k": {
      dispatchSelectedIndex({
        kind: "setSelectedIndex",
        update: (previous) => Math.max(previous - 1, 0),
      });
      return true;
    }
    case "a": {
      if (item?.needsReview && !isUpdatingItem(item._id)) {
        await updateStatus(item, "approved");
      }
      return true;
    }
    case "y": {
      if (
        item?.needsReview &&
        item._source !== "report" &&
        !isUpdatingItem(item._id)
      ) {
        await updateStatus(item, "rejected");
      }
      return true;
    }
    case "Enter": {
      if (item) {
        openDetail(item);
      }
      return true;
    }
    default: {
      return false;
    }
  }
}

export function useInboxKeyboard({
  dispatchSelectedIndex,
  filteredItems,
  isUpdatingItem,
  openDetail,
  selectedIndex,
  updateStatus,
}: UseInboxKeyboardOptions) {
  useEffect(
    function bindKeyboardNavigation() {
      const handleKeyDown = async (event: KeyboardEvent) => {
        const isTextInput =
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement;
        if (isTextInput || !filteredItems || filteredItems.length === 0) {
          return;
        }

        const handled = await handleInboxAction({
          dispatchSelectedIndex,
          isUpdatingItem,
          items: filteredItems,
          key: event.key,
          openDetail,
          selectedIndex,
          updateStatus,
        });
        if (handled) {
          event.preventDefault();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
    [
      dispatchSelectedIndex,
      filteredItems,
      isUpdatingItem,
      openDetail,
      selectedIndex,
      updateStatus,
    ]
  );
}
