import { useSyncExternalStore } from "react";

import {
  type BoardItem,
  FEEDBACK_BOARD_DATA,
  TRACKED_REQUEST,
} from "./landing-data";

export const SORTS = [
  { id: "votes", label: "Top voted" },
  { id: "newest", label: "Newest" },
  { id: "discussed", label: "Most discussed" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

const VISIBLE_ROWS = 4;

const ORDER_BY: Record<SortId, (item: BoardItem) => number> = {
  discussed: (item) => -item.comments,
  newest: (item) => item.ageMinutes,
  votes: (item) => -item.votes,
};

interface BoardState {
  filed: readonly BoardItem[];
  merges: ReadonlyMap<string, number>;
  mine: ReadonlySet<string>;
  selectedId: string;
  sortId: SortId;
  typed: string | null;
  votedIds: ReadonlySet<string>;
}

const INITIAL: BoardState = {
  filed: [],
  merges: new Map(),
  mine: new Set(),
  selectedId: TRACKED_REQUEST.id,
  sortId: "votes",
  typed: null,
  votedIds: new Set(),
};

const listeners = new Set<() => void>();

let state = INITIAL;

function set(next: BoardState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

export function select(id: string) {
  set({ ...state, selectedId: id });
}

export function sortBy(sortId: SortId) {
  set({ ...state, sortId });
}

export function toggleVote(id: string) {
  const votedIds = new Set(state.votedIds);
  if (votedIds.has(id)) {
    votedIds.delete(id);
  } else {
    votedIds.add(id);
  }
  set({ ...state, selectedId: id, votedIds });
}

export function fileRequest(item: BoardItem, typed: string) {
  set({
    ...state,
    filed: [item, ...state.filed],
    mine: new Set([...state.mine, item.id]),
    selectedId: item.id,
    sortId: "newest",
    typed,
  });
}

export function mergeRequest(id: string, typed: string) {
  const merges = new Map(state.merges);
  merges.set(id, (merges.get(id) ?? 0) + 1);
  set({
    ...state,
    merges,
    mine: new Set([...state.mine, id]),
    selectedId: id,
    typed,
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  return state;
}

function readInitial() {
  return INITIAL;
}

export function useBoard(): BoardState {
  return useSyncExternalStore(subscribe, read, readInitial);
}

export function useVisibleRows(): readonly BoardItem[] {
  const { filed, sortId } = useBoard();
  const order = (a: BoardItem, b: BoardItem) =>
    ORDER_BY[sortId](a) - ORDER_BY[sortId](b);
  const seeded = [...FEEDBACK_BOARD_DATA]
    .sort(order)
    .slice(0, Math.max(0, VISIBLE_ROWS - filed.length));
  return [...filed, ...seeded].sort(order);
}

export interface FollowedRequest {
  duplicates: number;
  isMine: boolean;
  item: BoardItem;
  typed: string;
  votes: number;
}

export function useFollowedRequest(): FollowedRequest {
  const board = useBoard();
  const pool: readonly BoardItem[] = [...board.filed, ...FEEDBACK_BOARD_DATA];
  const item =
    pool.find((candidate) => candidate.id === board.selectedId) ??
    TRACKED_REQUEST;
  const merged = board.merges.get(item.id) ?? 0;
  const isMine = board.mine.has(item.id);
  return {
    duplicates: (item.similar?.length ?? 0) + merged,
    isMine,
    item,
    typed: isMine && board.typed ? board.typed : item.title,
    votes: item.votes + merged + (board.votedIds.has(item.id) ? 1 : 0),
  };
}
