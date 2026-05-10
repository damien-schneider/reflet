import { cleanup, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useTasksHotkeys } from "@/features/autopilot/components/tasks/use-tasks-hotkeys";

beforeEach(() => {
  document.body.innerHTML = "";
  mockPush.mockReset();
});

afterEach(() => {
  cleanup();
});

function buildRows(count: number): HTMLElement[] {
  const created: HTMLElement[] = [];
  for (let i = 0; i < count; i += 1) {
    const div = document.createElement("div");
    div.setAttribute("data-task-row", "");
    div.dataset.index = String(i);
    document.body.appendChild(div);
    created.push(div);
  }
  return created;
}

describe("useTasksHotkeys", () => {
  it("invokes onQuickCreate when 'c' is pressed outside an input", async () => {
    const onQuickCreate = vi.fn();
    renderHook(() => useTasksHotkeys({ onQuickCreate }));
    const user = userEvent.setup();
    await user.keyboard("c");
    expect(onQuickCreate).toHaveBeenCalledTimes(1);
  });

  it("ignores 'c' when focus is in an input element", async () => {
    const onQuickCreate = vi.fn();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useTasksHotkeys({ onQuickCreate }));
    const user = userEvent.setup();
    await user.keyboard("c");
    expect(onQuickCreate).not.toHaveBeenCalled();
  });

  it("invokes onPaletteOpen when Cmd+K is pressed", async () => {
    const onPaletteOpen = vi.fn();
    renderHook(() => useTasksHotkeys({ onPaletteOpen }));
    const user = userEvent.setup();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(onPaletteOpen).toHaveBeenCalledTimes(1);
  });

  it("invokes onPaletteOpen when Ctrl+K is pressed", async () => {
    const onPaletteOpen = vi.fn();
    renderHook(() => useTasksHotkeys({ onPaletteOpen }));
    const user = userEvent.setup();
    await user.keyboard("{Control>}k{/Control}");
    expect(onPaletteOpen).toHaveBeenCalledTimes(1);
  });

  it("navigates rows with j/k and surfaces focusedIndex", async () => {
    buildRows(3);
    const { result } = renderHook(() => useTasksHotkeys());
    const user = userEvent.setup();
    await user.keyboard("j");
    expect(result.current.focusedIndex).toBe(0);
    await user.keyboard("j");
    expect(result.current.focusedIndex).toBe(1);
    await user.keyboard("k");
    expect(result.current.focusedIndex).toBe(0);
  });

  it("does not navigate past first or last row", async () => {
    buildRows(2);
    const { result } = renderHook(() => useTasksHotkeys());
    const user = userEvent.setup();
    await user.keyboard("k"); // no-op (focus -1 -> clamps to 0)
    expect(result.current.focusedIndex).toBe(0);
    await user.keyboard("j");
    await user.keyboard("j");
    await user.keyboard("j");
    expect(result.current.focusedIndex).toBe(1);
  });

  it("calls onOpenFocused with current focused index when Enter is pressed", async () => {
    buildRows(2);
    const onOpenFocused = vi.fn();
    renderHook(() => useTasksHotkeys({ onOpenFocused }));
    const user = userEvent.setup();
    await user.keyboard("j");
    await user.keyboard("{Enter}");
    expect(onOpenFocused).toHaveBeenCalledWith(0);
  });

  it("does not fire Enter when no row is focused", async () => {
    buildRows(2);
    const onOpenFocused = vi.fn();
    renderHook(() => useTasksHotkeys({ onOpenFocused }));
    const user = userEvent.setup();
    await user.keyboard("{Enter}");
    expect(onOpenFocused).not.toHaveBeenCalled();
  });

  it("invokes onClearSelection on Escape", async () => {
    const onClearSelection = vi.fn();
    renderHook(() => useTasksHotkeys({ onClearSelection }));
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("navigates to tasks via 'g t' chord", async () => {
    renderHook(() =>
      useTasksHotkeys({
        navigationTargets: { tasks: "/dashboard/acme/tasks" },
      })
    );
    const user = userEvent.setup();
    await user.keyboard("g");
    await user.keyboard("t");
    expect(mockPush).toHaveBeenCalledWith("/dashboard/acme/tasks");
  });

  it("ignores standalone 't' without preceding 'g'", async () => {
    renderHook(() =>
      useTasksHotkeys({
        navigationTargets: { tasks: "/dashboard/acme/tasks" },
      })
    );
    const user = userEvent.setup();
    await user.keyboard("t");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("expires the chord after the timeout", async () => {
    renderHook(() =>
      useTasksHotkeys({
        navigationTargets: { tasks: "/dashboard/acme/tasks" },
      })
    );
    const user = userEvent.setup();
    await user.keyboard("g");
    await new Promise((resolve) => setTimeout(resolve, 900));
    await user.keyboard("t");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not register hotkeys when disabled", async () => {
    const onQuickCreate = vi.fn();
    renderHook(() => useTasksHotkeys({ onQuickCreate, enabled: false }));
    const user = userEvent.setup();
    await user.keyboard("c");
    expect(onQuickCreate).not.toHaveBeenCalled();
  });
});
