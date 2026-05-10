import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory query state shared between hook calls.
let queryState: Record<string, string | string[] | null> = {};
const subscribers = new Set<() => void>();

function notify() {
  for (const sub of subscribers) {
    sub();
  }
}

vi.mock("nuqs", async () => {
  const actual = await vi.importActual<typeof import("nuqs")>("nuqs");
  return {
    ...actual,
    useQueryStates: (parsers: Record<string, unknown>, _opts?: unknown) => {
      // Build values from queryState using each parser's default.
      const values: Record<string, unknown> = {};
      for (const [key, parser] of Object.entries(parsers)) {
        const raw = queryState[key];
        const parserAny = parser as {
          parse?: (raw: string | null) => unknown;
          defaultValue?: unknown;
        };
        if (raw === undefined || raw === null) {
          values[key] = parserAny.defaultValue;
        } else if (Array.isArray(raw)) {
          values[key] = raw;
        } else {
          values[key] = parserAny.parse?.(raw) ?? parserAny.defaultValue ?? raw;
        }
      }

      const setter = (
        update:
          | Record<string, unknown>
          | ((prev: Record<string, unknown>) => Record<string, unknown>)
      ) => {
        const next =
          typeof update === "function"
            ? (
                update as (
                  p: Record<string, unknown>
                ) => Record<string, unknown>
              )(values)
            : update;
        for (const [key, value] of Object.entries(next)) {
          if (value === null || value === undefined) {
            delete queryState[key];
          } else {
            queryState[key] = value as string | string[];
          }
        }
        notify();
        return Promise.resolve(new URLSearchParams());
      };

      return [values, setter];
    },
  };
});

const { useTasksFilters } = await import("../use-tasks-filters");

beforeEach(() => {
  queryState = {};
  subscribers.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTasksFilters", () => {
  it("returns sane defaults", () => {
    const { result } = renderHook(() => useTasksFilters());
    expect(result.current.filters.status).toEqual([]);
    expect(result.current.filters.type).toEqual([]);
    expect(result.current.filters.priority).toEqual([]);
    expect(result.current.filters.assigneeUserId).toBe("");
    expect(result.current.filters.assignedAgent).toBe("");
    expect(result.current.filters.q).toBe("");
    expect(result.current.filters.groupBy).toBe("none");
    expect(result.current.filters.sortKey).toBe("updated");
    expect(result.current.filters.viewMode).toBe("list");
    expect(result.current.isDefault).toBe(true);
  });

  it("hydrates array filters from URL state", () => {
    queryState.status = ["todo", "in_progress"];
    queryState.priority = ["high"];
    const { result } = renderHook(() => useTasksFilters());
    expect(result.current.filters.status).toEqual(["todo", "in_progress"]);
    expect(result.current.filters.priority).toEqual(["high"]);
    expect(result.current.isDefault).toBe(false);
  });

  it("setFilters updates a single key without clobbering others", async () => {
    const { result, rerender } = renderHook(() => useTasksFilters());
    await act(async () => {
      await result.current.setFilters({ status: ["todo"] });
    });
    rerender();
    expect(result.current.filters.status).toEqual(["todo"]);
    expect(result.current.filters.priority).toEqual([]);
  });

  it("reset clears all filters", async () => {
    queryState.status = ["todo"];
    queryState.q = "search";
    const { result, rerender } = renderHook(() => useTasksFilters());
    expect(result.current.isDefault).toBe(false);
    await act(async () => {
      await result.current.reset();
    });
    rerender();
    expect(result.current.filters.status).toEqual([]);
    expect(result.current.filters.q).toBe("");
    expect(result.current.isDefault).toBe(true);
  });
});
