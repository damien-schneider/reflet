import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getStoredView,
  persistView,
} from "@/features/autopilot/components/views/initiatives-board-constants";

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initiatives board view persistence", () => {
  it("falls back to list when storage reads are blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: vi.fn(),
    });

    expect(getStoredView()).toBe("list");
  });

  it("does not crash when storage writes are blocked", () => {
    const setItem = vi.fn(() => {
      throw new Error("storage blocked");
    });
    vi.stubGlobal("localStorage", {
      getItem: originalLocalStorage.getItem,
      setItem,
    });

    expect(() => persistView("kanban")).not.toThrow();
    expect(setItem).toHaveBeenCalledWith(
      "autopilot-initiatives-view",
      "kanban"
    );
  });
});
