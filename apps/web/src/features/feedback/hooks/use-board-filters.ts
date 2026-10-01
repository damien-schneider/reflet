"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BoardView } from "@/features/feedback/components/board-view-toggle";
import type { SortOption } from "@/features/feedback/components/filters-bar";

const DEFAULT_SORT: SortOption = "newest";
const parseSelection = (value: string | null) =>
  value?.split(",").filter(Boolean) ?? [];

export interface BoardFiltersState {
  hideCompleted: boolean;
  searchQuery: string;
  selectedStatusIds: string[];
  selectedTagIds: string[];
  showSubmitDrawer: boolean;
  sortBy: SortOption;
  view: BoardView;
}
export interface BoardFiltersActions {
  clearFilters: () => void;
  closeSubmitDrawer: () => void;
  handleStatusChange: (id: string, checked: boolean) => void;
  handleTagChange: (id: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  openSubmitDrawer: () => void;
  setHideCompleted: (hide: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStatusIds: (ids: string[]) => void;
  setSelectedTagIds: (ids: string[]) => void;
  setSortBy: (sort: SortOption) => void;
  setView: (view: BoardView) => void;
}

function selectedIdsAfterToggle(ids: string[], id: string, checked: boolean) {
  return checked
    ? [...new Set([...ids, id])]
    : ids.filter((selected) => selected !== id);
}

export function useBoardFilters(
  defaultView: BoardView = "feed"
): BoardFiltersState & BoardFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const view =
    viewParam === "feed" ||
    viewParam === "roadmap" ||
    viewParam === "milestones"
      ? viewParam
      : defaultView;
  const sortParam = searchParams.get("sort");
  const sortBy =
    sortParam === "votes" ||
    sortParam === "newest" ||
    sortParam === "oldest" ||
    sortParam === "comments"
      ? sortParam
      : DEFAULT_SORT;
  const selectedTagIds = [
    ...new Set([
      ...parseSelection(searchParams.get("tags")),
      ...parseSelection(searchParams.get("tag")),
    ]),
  ];
  const selectedStatusIds = parseSelection(searchParams.get("status"));
  const searchQuery = searchParams.get("q") ?? "";

  function navigate(updates: Record<string, string | null>, push = false) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (push) {
      router.push(url, { scroll: false });
    } else {
      router.replace(url, { scroll: false });
    }
  }
  const setSelectedTagIds = (ids: string[]) =>
    navigate({ tag: null, tags: ids.join(",") });
  const setSelectedStatusIds = (ids: string[]) =>
    navigate({ status: ids.join(",") });
  return {
    clearFilters: () =>
      navigate({
        hide_completed: null,
        new: null,
        q: null,
        status: null,
        tag: null,
        tags: null,
      }),
    closeSubmitDrawer: () => navigate({ new: null }),
    handleStatusChange: (id, checked) =>
      setSelectedStatusIds(
        selectedIdsAfterToggle(selectedStatusIds, id, checked)
      ),
    handleTagChange: (id, checked) =>
      setSelectedTagIds(selectedIdsAfterToggle(selectedTagIds, id, checked)),
    hasActiveFilters: Boolean(
      searchQuery || selectedStatusIds.length || selectedTagIds.length
    ),
    hideCompleted: searchParams.get("hide_completed") !== "0",
    openSubmitDrawer: () => navigate({ new: "1" }, true),
    searchQuery,
    selectedStatusIds,
    selectedTagIds,
    setHideCompleted: (hide) => navigate({ hide_completed: hide ? null : "0" }),
    setSearchQuery: (query) => navigate({ q: query }),
    setSelectedStatusIds,
    setSelectedTagIds,
    setSortBy: (next) =>
      navigate({ sort: next === DEFAULT_SORT ? null : next }),
    setView: (next) =>
      navigate({ view: next === defaultView ? null : next }, true),
    showSubmitDrawer: searchParams.get("new") === "1",
    sortBy,
    view,
  };
}
