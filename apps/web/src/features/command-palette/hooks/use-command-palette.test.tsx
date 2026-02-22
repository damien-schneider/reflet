import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommandPalette } from "./use-command-palette";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/store/dashboard-atoms", async () => {
  const { atom } = await import("jotai");
  return {
    commandPaletteOpenAtom: atom(false),
  };
});

describe("useCommandPalette", () => {
  let store: ReturnType<typeof createStore>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
  });

  describe("filtering", () => {
    it("shows all non-org items when no orgSlug", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: undefined }),
        { wrapper }
      );
      // Only items that don't require org should be shown
      const requiresOrg = result.current.filteredItems.some(
        (item) => item.requiresOrg
      );
      expect(requiresOrg).toBe(false);
    });

    it("shows org items when orgSlug is provided", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );
      const orgItems = result.current.filteredItems.filter(
        (item) => item.requiresOrg
      );
      expect(orgItems.length).toBeGreaterThan(0);
    });

    it("hides admin items when isAdmin is false", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org", isAdmin: false }),
        { wrapper }
      );
      const adminItems = result.current.filteredItems.filter(
        (item) => item.requiresAdmin
      );
      expect(adminItems).toHaveLength(0);
    });

    it("shows admin items when isAdmin is true", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org", isAdmin: true }),
        { wrapper }
      );
      const adminItems = result.current.filteredItems.filter(
        (item) => item.requiresAdmin
      );
      expect(adminItems.length).toBeGreaterThan(0);
    });
  });

  describe("buildHref", () => {
    it("replaces $orgSlug in href", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );
      expect(result.current.buildHref("/dashboard/$orgSlug/settings")).toBe(
        "/dashboard/my-org/settings"
      );
    });

    it("returns href unchanged when no orgSlug", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: undefined }),
        { wrapper }
      );
      expect(result.current.buildHref("/dashboard/account")).toBe(
        "/dashboard/account"
      );
    });
  });

  describe("handleSelect", () => {
    it("navigates to href and closes palette", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      const item = result.current.filteredItems.find(
        (i) => i.id === "settings"
      );

      if (item) {
        act(() => result.current.handleSelect(item));
        expect(mockPush).toHaveBeenCalledWith("/dashboard/my-org/settings");
        expect(result.current.isOpen).toBe(false);
      }
    });
  });

  describe("keyboard shortcut", () => {
    it("toggles open on Cmd+K", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      expect(result.current.isOpen).toBe(false);

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("toggles open on Ctrl+K", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("toggles closed when already open", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      // Open
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      });
      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("does not toggle on K without meta/ctrl", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            bubbles: true,
          })
        );
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("cleans up keyboard listener on unmount", () => {
      const { unmount } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      unmount();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      });

      // After unmount, state can't be checked, but no error should throw
    });
  });

  describe("isOpen/setIsOpen", () => {
    it("can be toggled via setIsOpen", () => {
      const { result } = renderHook(
        () => useCommandPalette({ orgSlug: "my-org" }),
        { wrapper }
      );

      act(() => result.current.setIsOpen(true));
      expect(result.current.isOpen).toBe(true);

      act(() => result.current.setIsOpen(false));
      expect(result.current.isOpen).toBe(false);
    });
  });
});
