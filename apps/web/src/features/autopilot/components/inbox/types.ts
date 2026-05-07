import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type InboxItem = FunctionReturnType<
  typeof api.autopilot.queries.inbox.listInboxItems
>[number];

export type InboxStatusAction = "approved" | "rejected";
export type InboxTab = "pending" | "resolved";
export type SelectedIndexUpdate = number | ((previous: number) => number);

export interface SelectedIndexAction {
  kind: "setSelectedIndex";
  update: SelectedIndexUpdate;
}
