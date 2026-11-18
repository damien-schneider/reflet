import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuRadioGroup: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value: string;
  }) => (
    <div>
      <button
        data-testid="trigger-sort-change"
        onClick={() => onValueChange("newest")}
        type="button"
      >
        select-newest
      </button>
      <button
        data-testid="trigger-invalid-sort"
        onClick={() => onValueChange("invalid-sort")}
        type="button"
      >
        select-invalid
      </button>
      {children}
    </div>
  ),
  DropdownMenuRadioItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ render }: { render: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{render}</div>
  ),
}));

vi.mock("./feedback-board/filter-dropdown", () => ({
  FilterDropdown: () => null,
}));

import { FiltersBar, type SortOption } from "./filters-bar";

const defaultProps = {
  hideCompleted: false,
  onClearFilters: vi.fn(),
  onHideCompletedToggle: vi.fn(),
  onSortChange: vi.fn(),
  onStatusChange: vi.fn(),
  onTagChange: vi.fn(),
  selectedStatusIds: [] as string[],
  selectedTagIds: [] as string[],
  sortBy: "votes" as SortOption,
  statuses: [
    { _id: "s1", color: "green", name: "Open" },
    { _id: "s2", color: "red", name: "Closed" },
  ],
  tags: [
    { _id: "t1", color: "red", name: "Bug" },
    { _id: "t2", color: "blue", name: "Feature" },
  ],
};

describe("FiltersBar", () => {
  it.each([
    ["votes", "Most votes"],
    ["newest", "Newest"],
    ["oldest", "Oldest"],
    ["comments", "Most comments"],
  ] as const)(
    "shows the %s sort as “%s” on the sort control",
    (sortBy, label) => {
      render(<FiltersBar {...defaultProps} sortBy={sortBy} />);
      expect(
        within(screen.getByTestId("dropdown-trigger")).getByText(label)
      ).toBeInTheDocument();
    }
  );

  it("calls onSortChange when a valid sort option is selected", () => {
    const onSortChange = vi.fn();
    render(<FiltersBar {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByTestId("trigger-sort-change"));
    expect(onSortChange).toHaveBeenCalledWith("newest");
  });

  it("does not call onSortChange for invalid sort value", () => {
    const onSortChange = vi.fn();
    render(<FiltersBar {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByTestId("trigger-invalid-sort"));
    expect(onSortChange).not.toHaveBeenCalled();
  });
});
