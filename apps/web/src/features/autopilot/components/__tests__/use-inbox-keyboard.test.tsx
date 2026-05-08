import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  InboxItem,
  SelectedIndexAction,
} from "@/features/autopilot/components/inbox/types";
import { useInboxKeyboard } from "@/features/autopilot/components/inbox/use-inbox-keyboard";
import { toId, toOrgId } from "@/lib/convex-helpers";

afterEach(() => {
  cleanup();
});

function createWorkItem(id: string, title: string): InboxItem {
  return {
    _creationTime: 1,
    _id: toId("autopilotWorkItems", id),
    _source: "work",
    assignedAgent: "dev",
    createdAt: 1,
    description: `${title} description`,
    needsReview: true,
    organizationId: toOrgId("org_123"),
    priority: "medium",
    reviewType: "task_approval",
    status: "in_review",
    title,
    type: "task",
    updatedAt: 1,
  };
}

function KeyboardHarness() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = [
    createWorkItem("first-task", "First task"),
    createWorkItem("second-task", "Second task"),
  ];
  const dispatchSelectedIndex = (action: SelectedIndexAction) => {
    setSelectedIndex((previous) =>
      typeof action.update === "function"
        ? action.update(previous)
        : action.update
    );
  };

  useInboxKeyboard({
    dispatchSelectedIndex,
    filteredItems: items,
    openDetail: vi.fn(),
    selectedIndex,
  });

  return (
    <div>
      {items.map((item, index) => (
        <button
          aria-current={index === selectedIndex ? "true" : undefined}
          key={item._id}
          type="button"
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}

describe("useInboxKeyboard", () => {
  it("keeps row navigation active when an inbox row button is focused", async () => {
    const user = userEvent.setup();
    render(<KeyboardHarness />);

    await user.click(screen.getByRole("button", { name: "First task" }));
    await user.keyboard("j");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Second task" })
      ).toHaveAttribute("aria-current", "true")
    );
  });
});
