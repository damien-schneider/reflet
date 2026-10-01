import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HoverQuickActions } from "./hover-quick-actions";

const renderActions = (status: string) => {
  const actions = { onAssignToMe: vi.fn(), onStatusChange: vi.fn() };
  const onRowClick = vi.fn();
  render(
    <div onClick={onRowClick}>
      <HoverQuickActions actions={actions} status={status} />
    </div>
  );
  return { actions, onRowClick };
};

describe("HoverQuickActions", () => {
  it("resolves an open conversation without selecting the row", async () => {
    const { actions, onRowClick } = renderActions("open");
    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(actions.onStatusChange).toHaveBeenCalledWith("resolved");
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("offers reopen instead of resolve or close once a conversation is done", async () => {
    const { actions } = renderActions("resolved");
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(actions.onStatusChange).toHaveBeenCalledWith("open");
  });
});
