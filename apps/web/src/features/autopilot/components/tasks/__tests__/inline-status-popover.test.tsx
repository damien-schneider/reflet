import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toId } from "@/lib/convex-helpers";

const { mockUpdateWorkItem, mockToastError } = vi.hoisted(() => ({
  mockUpdateWorkItem: vi.fn().mockResolvedValue(null),
  mockToastError: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateWorkItem,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        work: {
          updateWorkItem: "autopilot.work.updateWorkItem",
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (message: string) => mockToastError(message),
  },
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="popover-trigger" type="button">
      {children}
    </button>
  ),
  PopoverContent: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <div data-testid="popover-content" onClick={onClick} role="presentation">
      {children}
    </div>
  ),
}));

import { InlineStatusPopover } from "@/features/autopilot/components/tasks/inline-status-popover";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function getStatusOption(label: string) {
  const buttons = screen.getAllByRole("button");
  const match = buttons.find(
    (button) =>
      button.hasAttribute("aria-pressed") && button.textContent === label
  );
  if (!match) {
    throw new Error(`Status option "${label}" not found`);
  }
  return match;
}

describe("InlineStatusPopover", () => {
  const workItemId = toId("autopilotWorkItems", "wi_1");

  it("renders the current status label", () => {
    render(<InlineStatusPopover status="todo" workItemId={workItemId} />);

    expect(screen.getByTestId("popover-trigger").textContent).toMatch(/To Do/);
  });

  it("renders all status options including triage", () => {
    render(<InlineStatusPopover status="todo" workItemId={workItemId} />);

    const labels = [
      "Triage",
      "Backlog",
      "To Do",
      "In Progress",
      "In Review",
      "Done",
      "Cancelled",
    ];
    for (const label of labels) {
      expect(getStatusOption(label)).toBeInTheDocument();
    }
  });

  it("calls updateWorkItem with the next status when an option is clicked", async () => {
    const user = userEvent.setup();
    render(<InlineStatusPopover status="todo" workItemId={workItemId} />);

    await user.click(getStatusOption("In Progress"));

    expect(mockUpdateWorkItem).toHaveBeenCalledWith({
      workItemId,
      status: "in_progress",
    });
  });

  it("does not call mutation when the same status is selected", async () => {
    const user = userEvent.setup();
    render(<InlineStatusPopover status="todo" workItemId={workItemId} />);

    await user.click(getStatusOption("To Do"));

    expect(mockUpdateWorkItem).not.toHaveBeenCalled();
  });

  it("does not bubble the option click to a parent handler", async () => {
    const parentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={parentClick} role="presentation">
        <InlineStatusPopover status="todo" workItemId={workItemId} />
      </div>
    );

    await user.click(getStatusOption("In Progress"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("toasts an error when mutation fails", async () => {
    mockUpdateWorkItem.mockRejectedValueOnce(new Error("denied"));
    const user = userEvent.setup();
    render(<InlineStatusPopover status="todo" workItemId={workItemId} />);

    await user.click(getStatusOption("Done"));

    expect(mockToastError).toHaveBeenCalledWith("Failed to update status");
  });
});
