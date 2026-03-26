import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

afterEach(cleanup);

describe("useKeyboardShortcuts", () => {
  it("calls handler when registered key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ j: handler }, { enabled: true }));

    const event = new KeyboardEvent("keydown", { key: "j" });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not call handler when a different key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ j: handler }, { enabled: true }));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not fire when an input element is focused", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ j: handler }, { enabled: true }));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("does not fire when textarea is focused", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ j: handler }, { enabled: true }));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("supports modifier keys via meta+ prefix", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({ "meta+k": handler }, { enabled: true })
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
    expect(handler).toHaveBeenCalledOnce();
  });

  it("fires modifier shortcuts even when input is focused", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({ "meta+k": handler }, { enabled: true })
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
    expect(handler).toHaveBeenCalledOnce();

    document.body.removeChild(input);
  });

  it("does not fire when enabled is false", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ j: handler }, { enabled: false }));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ j: handler }, { enabled: true })
    );

    unmount();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    expect(handler).not.toHaveBeenCalled();
  });
});
