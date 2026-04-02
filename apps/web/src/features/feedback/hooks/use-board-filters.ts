"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { BoardView } from "../components/board-view-toggle";
import type { SortOption } from "../components/filters-bar";

const URL_PARAM_KEYS = {
  view: "view",
  sort: "sort",
  status: "status",
  tags: "tags",
  tag: "tag", // Single tag filter (from tag filter bar)
  search: "q",
  newFeedback: "new", // Submit feedback drawer
  hideCompleted: "hide_completed", // "0" = show completed; absent = hide (default)
} as const;

const DEFAULT_VIEW: BoardView = "feed";
const DEFAULT_SORT: SortOption = "votes";

function parseArrayParam<T extends string = string>(value: string | null): T[] {
  if (!value) {
    return [];
  }
  return value.split(",").filter(Boolean) as T[];
}

function parseIdParam<T extends string>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  return value as T;
}

function serializeArrayParam(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  return values.join(",");
}

export interface BoardFiltersState {
  hideCompleted: boolean; // Hide the highest-order (Done) status by default
  searchQuery: string;
  selectedStatusIds: Id<"organizationStatuses">[];
  selectedTagId: Id<"tags"> | null; // Single tag filter (from tag filter bar)
  selectedTagIds: Id<"tags">[];
  showSubmitDrawer: boolean; // Submit feedback drawer state
  sortBy: SortOption;
  view: BoardView;
}

export interface BoardFiltersActions {
  clearFilters: () => void;
  closeSubmitDrawer: () => void;
  handleStatusChange: (statusId: string, checked: boolean) => void;
  handleTagChange: (tagId: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  openSubmitDrawer: () => void;
  setHideCompleted: (hide: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStatusIds: (ids: string[]) => void;
  setSelectedTagId: (id: string | null) => void; // Single tag filter (from tag filter bar)
  setSelectedTagIds: (ids: string[]) => void;
  setSortBy: (sort: SortOption) => void;
  setView: (view: BoardView) => void;
}

export function useBoardFilters(
  defaultView: BoardView = DEFAULT_VIEW
): BoardFiltersState & BoardFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const viewParam = searchParams.get(URL_PARAM_KEYS.view);
  const view =
    viewParam === "roadmap" ||
    viewParam === "feed" ||
    viewParam === "milestones"
      ? viewParam
      : defaultView;

  const sortParam = searchParams.get(URL_PARAM_KEYS.sort);
  const sortBy =
    sortParam === "votes" ||
    sortParam === "newest" ||
    sortParam === "oldest" ||
    sortParam === "comments"
      ? sortParam
      : DEFAULT_SORT;

  const state: BoardFiltersState = {
    view,
    sortBy,
    selectedStatusIds: parseArrayParam<Id<"organizationStatuses">>(
      searchParams.get(URL_PARAM_KEYS.status)
    ),
    selectedTagIds: parseArrayParam<Id<"tags">>(
      searchParams.get(URL_PARAM_KEYS.tags)
    ),
    selectedTagId: parseIdParam<Id<"tags">>(
      searchParams.get(URL_PARAM_KEYS.tag)
    ),
    searchQuery: searchParams.get(URL_PARAM_KEYS.search) ?? "",
    showSubmitDrawer: searchParams.get(URL_PARAM_KEYS.newFeedback) === "1",
    // Default true (hide); set "0" in URL to show completed
    hideCompleted: searchParams.get(URL_PARAM_KEYS.hideCompleted) !== "0",
  };

  // Helper to update URL params
  const updateParams = (
    updates: Partial<Record<keyof typeof URL_PARAM_KEYS, string | null>>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      const paramKey = URL_PARAM_KEYS[key as keyof typeof URL_PARAM_KEYS];
      if (value === null || value === "") {
        params.delete(paramKey);
      } else {
        params.set(paramKey, value);
      }
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Helper to push to history (for view changes that should be navigable with back/forward)
  const pushParams = (
    updates: Partial<Record<keyof typeof URL_PARAM_KEYS, string | null>>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      const paramKey = URL_PARAM_KEYS[key as keyof typeof URL_PARAM_KEYS];
      if (value === null || value === "") {
        params.delete(paramKey);
      } else {
        params.set(paramKey, value);
      }
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Actions
  const setView = (view: BoardView) => {
    pushParams({ view: view === defaultView ? null : view });
  };

  const setSortBy = (sort: SortOption) => {
    updateParams({ sort: sort === DEFAULT_SORT ? null : sort });
  };

  const setSelectedStatusIds = (ids: string[]) => {
    updateParams({ status: serializeArrayParam(ids) });
  };

  const setSelectedTagIds = (ids: string[]) => {
    updateParams({ tags: serializeArrayParam(ids) });
  };

  const setSelectedTagId = (id: string | null) => {
    updateParams({ tag: id });
  };

  const setSearchQuery = (query: string) => {
    updateParams({ search: query || null });
  };

  const openSubmitDrawer = () => {
    pushParams({ newFeedback: "1" });
  };

  const closeSubmitDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(URL_PARAM_KEYS.newFeedback);
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleStatusChange = (statusId: string, checked: boolean) => {
    const newIds = checked
      ? [...state.selectedStatusIds, statusId]
      : state.selectedStatusIds.filter((id) => id !== statusId);
    setSelectedStatusIds(newIds);
  };

  const handleTagChange = (tagId: string, checked: boolean) => {
    const newIds = checked
      ? [...state.selectedTagIds, tagId]
      : state.selectedTagIds.filter((id) => id !== tagId);
    setSelectedTagIds(newIds);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    // Keep view param if it's not the default
    if (state.view !== defaultView) {
      params.set(URL_PARAM_KEYS.view, state.view);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const setHideCompleted = (hide: boolean) => {
    // "hide" is the default, so only store "0" (show) in the URL
    updateParams({ hideCompleted: hide ? null : "0" });
  };

  const hasActiveFilters =
    !!state.searchQuery ||
    state.selectedStatusIds.length > 0 ||
    state.selectedTagIds.length > 0 ||
    state.selectedTagId !== null ||
    state.sortBy !== DEFAULT_SORT;

  return {
    ...state,
    setView,
    setSortBy,
    setSelectedStatusIds,
    setSelectedTagIds,
    setSelectedTagId,
    setSearchQuery,
    openSubmitDrawer,
    closeSubmitDrawer,
    handleStatusChange,
    handleTagChange,
    clearFilters,
    setHideCompleted,
    hasActiveFilters,
  };
}
