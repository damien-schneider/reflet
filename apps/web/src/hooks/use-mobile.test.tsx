import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  let listeners: Map<string, (() => void)[]>;

  const createMockMatchMedia = (matches: boolean) => {
    listeners = new Map();
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(cb);
        listeners.set(event, existing);
      }),
      removeEventListener: vi.fn((event: string, cb: () => void) => {
        const existing = listeners.get(event) ?? [];
        listeners.set(
          event,
          existing.filter((l) => l !== cb)
        );
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: originalInnerWidth,
    });
  });

  it("returns true when window width is below 768px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 500,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when window width is 768px or above", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when media query changes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 500,
      });
      const changeListeners = listeners.get("change") ?? [];
      for (const listener of changeListeners) {
        listener();
      }
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    const changeListeners = listeners.get("change") ?? [];
    expect(changeListeners).toHaveLength(0);
  });

  it("returns false at exactly 768px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 768,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true at 767px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 767,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
