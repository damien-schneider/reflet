import { renderHook } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import useClickOutside from "./use-click-outside";

describe("useClickOutside", () => {
  const createContainer = () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return container;
  };

  const createRefWithElement = (): RefObject<HTMLDivElement> => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const ref = createRef<HTMLDivElement>() as {
      current: HTMLDivElement | null;
    };
    ref.current = element;
    return ref as RefObject<HTMLDivElement>;
  };

  it("calls handler when clicking outside the ref element", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();
    const outside = createContainer();

    renderHook(() => useClickOutside(ref, handler));

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when clicking inside the ref element", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();
    const child = document.createElement("span");
    ref.current?.appendChild(child);

    renderHook(() => useClickOutside(ref, handler));

    child.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler on touchstart outside", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();
    const outside = createContainer();

    renderHook(() => useClickOutside(ref, handler));

    outside.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler on touchstart inside", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();

    renderHook(() => useClickOutside(ref, handler));

    ref.current?.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when ref.current is null", () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();

    renderHook(() => useClickOutside(ref, handler));

    document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("removes event listeners on unmount", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();
    const outside = createContainer();

    const { unmount } = renderHook(() => useClickOutside(ref, handler));
    unmount();

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("updates handler when it changes", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const ref = createRefWithElement();
    const outside = createContainer();

    const { rerender } = renderHook(
      ({ handler }) => useClickOutside(ref, handler),
      { initialProps: { handler: handler1 } }
    );

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler1).toHaveBeenCalledTimes(1);

    rerender({ handler: handler2 });

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when event.target is not a Node", () => {
    const handler = vi.fn();
    const ref = createRefWithElement();

    renderHook(() => useClickOutside(ref, handler));

    // Dispatch event with null target - the condition checks event.target instanceof Node
    const event = new Event("mousedown", { bubbles: true });
    Object.defineProperty(event, "target", { value: null });
    document.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();
  });
});
