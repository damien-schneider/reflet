import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { TasksFilterBar } from "../tasks-filter-bar";
import type { TaskFilters } from "../use-tasks-filters";

const DEFAULT_FILTERS: TaskFilters = {
  status: [],
  type: [],
  priority: [],
  assigneeUserId: "",
  assignedAgent: "",
  labelIds: [],
  q: "",
  groupBy: "none",
  sortKey: "updated",
  viewMode: "list",
};

function Harness({ initial }: { initial?: Partial<TaskFilters> }) {
  const [filters, setFilters] = useState<TaskFilters>({
    ...DEFAULT_FILTERS,
    ...initial,
  });
  return (
    <TasksFilterBar
      filters={filters}
      isDefault={
        filters.status.length === 0 &&
        filters.type.length === 0 &&
        filters.priority.length === 0
      }
      onReset={() => setFilters(DEFAULT_FILTERS)}
      setFilters={(update) => setFilters((prev) => ({ ...prev, ...update }))}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("TasksFilterBar", () => {
  it("renders core filter chips", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /Status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Type/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Priority/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agent/i })).toBeInTheDocument();
  });

  it("toggles a status filter when a chip option is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /Status/i }));
    const todoOption = await screen.findByRole("button", { name: /To Do/i });
    await user.click(todoOption);

    // The chip now shows a count of 1 next to the label.
    const chip = screen.getByRole("button", { name: /Status/i });
    expect(chip.textContent).toContain("1");
  });

  it("shows a Reset button when filters are non-default", () => {
    render(<Harness initial={{ status: ["todo"] }} />);
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
  });

  it("hides the Reset button when filters are default", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Reset/i })).toBeNull();
  });
});
