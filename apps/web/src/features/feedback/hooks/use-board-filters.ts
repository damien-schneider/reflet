"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

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
  view: BoardView;
  sortBy: SortOption;
  selectedStatusIds: Id<"organizationStatuses">[];
  selectedTagIds: Id<"tags">[];
  selectedTagId: Id<"tags"> | null; // Single tag filter (from tag filter bar)
  searchQuery: string;
  showSubmitDrawer: boolean; // Submit feedback drawer state
}

export interface BoardFiltersActions {
  setView: (view: BoardView) => void;
  setSortBy: (sort: SortOption) => void;
  setSelectedStatusIds: (ids: string[]) => void;
  setSelectedTagIds: (ids: string[]) => void;
  setSelectedTagId: (id: string | null) => void; // Single tag filter (from tag filter bar)
  setSearchQuery: (query: string) => void;
  openSubmitDrawer: () => void;
  closeSubmitDrawer: () => void;
  handleStatusChange: (statusId: string, checked: boolean) => void;
  handleTagChange: (tagId: string, checked: boolean) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useBoardFilters(
  defaultView: BoardView = DEFAULT_VIEW
): BoardFiltersState & BoardFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const state = useMemo((): BoardFiltersState => {
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

    return {
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
    };
  }, [searchParams, defaultView]);

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Partial<Record<keyof typeof URL_PARAM_KEYS, string | null>>) => {
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
    },
    [router, pathname, searchParams]
  );

  // Helper to push to history (for view changes that should be navigable with back/forward)
  const pushParams = useCallback(
    (updates: Partial<Record<keyof typeof URL_PARAM_KEYS, string | null>>) => {
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
    },
    [router, pathname, searchParams]
  );

  // Actions
  const setView = useCallback(
    (view: BoardView) => {
      pushParams({ view: view === defaultView ? null : view });
    },
    [pushParams, defaultView]
  );

  const setSortBy = useCallback(
    (sort: SortOption) => {
      updateParams({ sort: sort === DEFAULT_SORT ? null : sort });
    },
    [updateParams]
  );

  const setSelectedStatusIds = useCallback(
    (ids: string[]) => {
      updateParams({ status: serializeArrayParam(ids) });
    },
    [updateParams]
  );

  const setSelectedTagIds = useCallback(
    (ids: string[]) => {
      updateParams({ tags: serializeArrayParam(ids) });
    },
    [updateParams]
  );

  const setSelectedTagId = useCallback(
    (id: string | null) => {
      updateParams({ tag: id });
    },
    [updateParams]
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      updateParams({ search: query || null });
    },
    [updateParams]
  );

  const openSubmitDrawer = useCallback(() => {
    pushParams({ newFeedback: "1" });
  }, [pushParams]);

  const closeSubmitDrawer = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(URL_PARAM_KEYS.newFeedback);
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  const handleStatusChange = useCallback(
    (statusId: string, checked: boolean) => {
      const newIds = checked
        ? [...state.selectedStatusIds, statusId]
        : state.selectedStatusIds.filter((id) => id !== statusId);
      setSelectedStatusIds(newIds);
    },
    [state.selectedStatusIds, setSelectedStatusIds]
  );

  const handleTagChange = useCallback(
    (tagId: string, checked: boolean) => {
      const newIds = checked
        ? [...state.selectedTagIds, tagId]
        : state.selectedTagIds.filter((id) => id !== tagId);
      setSelectedTagIds(newIds);
    },
    [state.selectedTagIds, setSelectedTagIds]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    // Keep view param if it's not the default
    if (state.view !== defaultView) {
      params.set(URL_PARAM_KEYS.view, state.view);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, pathname, state.view, defaultView]);

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
    hasActiveFilters,
  };
}
