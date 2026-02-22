import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsTablet } from "./use-tablet";

describe("useIsTablet", () => {
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

  it("returns true when width is in tablet range (768-1023)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 900,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it("returns false when width is below tablet range", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 500,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it("returns false when width is above tablet range", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it("returns true at exactly 768px (min boundary)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 768,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it("returns true at 1023px (max boundary)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1023,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it("returns false at exactly 1024px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it("returns false at 767px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 767,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it("updates when media query changes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 500,
    });
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        value: 900,
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
      value: 900,
    });
    window.matchMedia = createMockMatchMedia(true);

    const { unmount } = renderHook(() => useIsTablet());
    unmount();

    const changeListeners = listeners.get("change") ?? [];
    expect(changeListeners).toHaveLength(0);
  });
});
