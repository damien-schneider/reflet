import type { WorkItemPriority } from "@/features/autopilot/components/tasks/inline-priority-popover";
import type { WorkItemStatus } from "@/features/autopilot/components/tasks/inline-status-popover";

export type CreateTaskType = "task" | "bug" | "story";

export interface CreateTaskState {
  createMore: boolean;
  description: string;
  expanded: boolean;
  isPublic: boolean;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  submitting: boolean;
  title: string;
  type: CreateTaskType;
}

type CreateTaskAction =
  | { kind: "resetAll" }
  | { kind: "resetAfterCreate" }
  | { kind: "setCreateMore"; value: boolean }
  | { kind: "setDescription"; value: string }
  | { kind: "setPriority"; value: WorkItemPriority }
  | { kind: "setPublic"; value: boolean }
  | { kind: "setStatus"; value: WorkItemStatus }
  | { kind: "setSubmitting"; value: boolean }
  | { kind: "setTitle"; value: string }
  | { kind: "setType"; value: CreateTaskType }
  | { kind: "toggleExpanded" };

export const INITIAL_CREATE_STATE: CreateTaskState = {
  title: "",
  description: "",
  type: "task",
  priority: "medium",
  status: "backlog",
  isPublic: false,
  createMore: false,
  expanded: false,
  submitting: false,
};

const TEAM_KEY_REGEX = /[A-Za-z]/g;

export function createTaskReducer(
  state: CreateTaskState,
  action: CreateTaskAction
): CreateTaskState {
  if (action.kind === "resetAll") {
    return INITIAL_CREATE_STATE;
  }
  if (action.kind === "resetAfterCreate") {
    return { ...state, title: "", description: "", submitting: false };
  }
  if (action.kind === "setCreateMore") {
    return { ...state, createMore: action.value };
  }
  if (action.kind === "setDescription") {
    return { ...state, description: action.value };
  }
  if (action.kind === "setPriority") {
    return { ...state, priority: action.value };
  }
  if (action.kind === "setPublic") {
    return { ...state, isPublic: action.value };
  }
  if (action.kind === "setStatus") {
    return { ...state, status: action.value };
  }
  if (action.kind === "setSubmitting") {
    return { ...state, submitting: action.value };
  }
  if (action.kind === "setTitle") {
    return { ...state, title: action.value };
  }
  if (action.kind === "setType") {
    return { ...state, type: action.value };
  }
  if (action.kind === "toggleExpanded") {
    return { ...state, expanded: !state.expanded };
  }
  const unreachable: never = action;
  return unreachable;
}

export function formatTeamKey(value: string | undefined): string {
  const alpha = value?.match(TEAM_KEY_REGEX)?.join("") ?? "";
  return alpha.length >= 3 ? alpha.slice(0, 6).toUpperCase() : "ORG";
}
