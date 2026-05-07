import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { InboxTab, SelectedIndexAction } from "./types";

export interface InboxPageState {
  activeTab: InboxTab;
  detailDocId: Id<"autopilotDocuments"> | null;
  detailReportId: Id<"autopilotReports"> | null;
  pendingItemIds: string[];
  searchQuery: string;
  selectedIndex: number;
}

export type InboxPageAction =
  | { itemId: string; kind: "addPendingItem" }
  | { kind: "patch"; state: Partial<InboxPageState> }
  | { itemId: string; kind: "removePendingItem" }
  | SelectedIndexAction;

export const initialInboxPageState: InboxPageState = {
  activeTab: "pending",
  detailDocId: null,
  detailReportId: null,
  pendingItemIds: [],
  searchQuery: "",
  selectedIndex: 0,
};

export function reduceInboxPageState(
  state: InboxPageState,
  action: InboxPageAction
): InboxPageState {
  if (action.kind === "patch") {
    return { ...state, ...action.state };
  }
  if (action.kind === "setSelectedIndex") {
    return {
      ...state,
      selectedIndex:
        typeof action.update === "function"
          ? action.update(state.selectedIndex)
          : action.update,
    };
  }
  if (action.kind === "addPendingItem") {
    if (state.pendingItemIds.includes(action.itemId)) {
      return state;
    }
    return {
      ...state,
      pendingItemIds: [...state.pendingItemIds, action.itemId],
    };
  }
  if (action.kind === "removePendingItem") {
    return {
      ...state,
      pendingItemIds: state.pendingItemIds.filter((id) => id !== action.itemId),
    };
  }
  const exhaustive: never = action;
  return exhaustive;
}
