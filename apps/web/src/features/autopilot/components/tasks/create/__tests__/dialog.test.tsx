import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toId } from "@/lib/convex-helpers";

const { mockCreateWorkItem, mockToastError, mockToastSuccess } = vi.hoisted(
  () => ({
    mockCreateWorkItem: vi.fn().mockResolvedValue(null),
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn(),
  })
);

vi.mock("convex/react", () => ({
  useMutation: () => mockCreateWorkItem,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      mutations: {
        work: {
          createWorkItem: "autopilot.work.createWorkItem",
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (message: string) => mockToastError(message),
    success: (message: string) => mockToastSuccess(message),
  },
}));

import { CreateTaskDialog } from "@/features/autopilot/components/tasks/create/dialog";

const organizationId = toId("organizations", "org_1");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockCreateWorkItem.mockResolvedValue(null);
});

describe("CreateTaskDialog", () => {
  it("creates an issue from the Linear-style composer and keeps it open when create more is enabled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CreateTaskDialog
        isOpen
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        teamKey="cloud"
      />
    );

    const dialog = screen.getByRole("dialog", { name: "New issue" });
    expect(within(dialog).getByText("CLOUD")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Status: Backlog" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Priority: Medium" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Type: Task" })
    ).toBeInTheDocument();

    await user.type(
      within(dialog).getByRole("textbox", { name: "Issue title" }),
      "Draft launch checklist"
    );
    await user.click(
      within(dialog).getByRole("switch", { name: "Create more" })
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create issue" })
    );

    expect(mockCreateWorkItem).toHaveBeenCalledWith({
      organizationId,
      type: "task",
      title: "Draft launch checklist",
      description: "",
      priority: "medium",
      status: "backlog",
      isPublicRoadmap: undefined,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Issue created");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      within(dialog).getByRole("textbox", { name: "Issue title" })
    ).toHaveValue("");
  });
});
