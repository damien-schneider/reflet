import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  SortAscending: ({ "data-icon": icon }: { "data-icon"?: string }) => (
    <span data-icon={icon} data-testid="sort-icon" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    size,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    size?: string;
    variant?: string;
  }) => (
    <button
      data-size={size}
      data-variant={variant}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuRadioGroup: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value: string;
  }) => (
    <div data-testid="radio-group" data-value={value}>
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
  DropdownMenuRadioItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button data-testid={`radio-${value}`} data-value={value} type="button">
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ render }: { render: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{render}</div>
  ),
}));

vi.mock("./feedback-board/filter-dropdown", () => ({
  FilterDropdown: ({
    hideCompleted,
    selectedStatusIds,
    selectedTagIds,
  }: {
    hideCompleted: boolean;
    selectedStatusIds: string[];
    selectedTagIds: string[];
  }) => (
    <div
      data-hide-completed={hideCompleted}
      data-status-count={selectedStatusIds.length}
      data-tag-count={selectedTagIds.length}
      data-testid="filter-dropdown"
    />
  ),
}));

import { FiltersBar, type SortOption } from "./filters-bar";

afterEach(cleanup);

const defaultProps = {
  sortBy: "votes" as SortOption,
  onSortChange: vi.fn(),
  hideCompleted: false,
  onHideCompletedToggle: vi.fn(),
  statuses: [
    { _id: "s1", name: "Open", color: "green" },
    { _id: "s2", name: "Closed", color: "red" },
  ],
  selectedStatusIds: [] as string[],
  onStatusChange: vi.fn(),
  tags: [
    { _id: "t1", name: "Bug", color: "red" },
    { _id: "t2", name: "Feature", color: "blue" },
  ],
  selectedTagIds: [] as string[],
  onTagChange: vi.fn(),
  onClearFilters: vi.fn(),
};

describe("FiltersBar", () => {
  it("renders filter dropdown", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
  });

  it("renders sort dropdown with current sort label", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getAllByText("Most Votes").length).toBeGreaterThan(0);
  });

  it("renders all sort options", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("radio-votes")).toBeInTheDocument();
    expect(screen.getByTestId("radio-newest")).toBeInTheDocument();
    expect(screen.getByTestId("radio-oldest")).toBeInTheDocument();
    expect(screen.getByTestId("radio-comments")).toBeInTheDocument();
  });

  it("shows correct label for newest sort", () => {
    render(<FiltersBar {...defaultProps} sortBy="newest" />);
    expect(screen.getAllByText("Newest").length).toBeGreaterThan(0);
  });

  it("shows correct label for oldest sort", () => {
    render(<FiltersBar {...defaultProps} sortBy="oldest" />);
    expect(screen.getAllByText("Oldest").length).toBeGreaterThan(0);
  });

  it("shows correct label for comments sort", () => {
    render(<FiltersBar {...defaultProps} sortBy="comments" />);
    expect(screen.getAllByText("Most Comments").length).toBeGreaterThan(0);
  });

  it("passes hideCompleted to filter dropdown", () => {
    render(<FiltersBar {...defaultProps} hideCompleted={true} />);
    expect(screen.getByTestId("filter-dropdown")).toHaveAttribute(
      "data-hide-completed",
      "true"
    );
  });

  it("passes selected filters to filter dropdown", () => {
    render(
      <FiltersBar
        {...defaultProps}
        selectedStatusIds={["s1"]}
        selectedTagIds={["t1", "t2"]}
      />
    );
    const dropdown = screen.getByTestId("filter-dropdown");
    expect(dropdown).toHaveAttribute("data-status-count", "1");
    expect(dropdown).toHaveAttribute("data-tag-count", "2");
  });

  it("renders sort icon", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("sort-icon")).toBeInTheDocument();
  });

  it("renders dropdown trigger and content", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
  });

  it("radio group has correct value for votes", () => {
    render(<FiltersBar {...defaultProps} sortBy="votes" />);
    const group = screen.getByTestId("radio-group");
    expect(group).toHaveAttribute("data-value", "votes");
  });

  it("radio group has correct value for newest", () => {
    render(<FiltersBar {...defaultProps} sortBy="newest" />);
    const group = screen.getByTestId("radio-group");
    expect(group).toHaveAttribute("data-value", "newest");
  });

  it("passes hideCompleted=false to filter dropdown", () => {
    render(<FiltersBar {...defaultProps} hideCompleted={false} />);
    expect(screen.getByTestId("filter-dropdown")).toHaveAttribute(
      "data-hide-completed",
      "false"
    );
  });

  it("passes empty status and tag counts when none selected", () => {
    render(<FiltersBar {...defaultProps} />);
    const dropdown = screen.getByTestId("filter-dropdown");
    expect(dropdown).toHaveAttribute("data-status-count", "0");
    expect(dropdown).toHaveAttribute("data-tag-count", "0");
  });

  it("renders sort icon", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("sort-icon")).toBeInTheDocument();
  });

  it("displays the current sort value label", () => {
    const { container } = render(
      <FiltersBar {...defaultProps} sortBy="recent" />
    );
    expect(container.textContent).toMatch(
      /Most Votes|Newest|Oldest|Most Comments/i
    );
  });

  it("renders filter dropdown component", () => {
    render(<FiltersBar {...defaultProps} />);
    expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
  });

  it("passes selectedStatusIds to filter dropdown", () => {
    render(<FiltersBar {...defaultProps} selectedStatusIds={["s1", "s2"]} />);
    const dropdown = screen.getByTestId("filter-dropdown");
    expect(dropdown).toHaveAttribute("data-status-count", "2");
  });

  it("passes selectedTagIds to filter dropdown", () => {
    render(<FiltersBar {...defaultProps} selectedTagIds={["t1"]} />);
    const dropdown = screen.getByTestId("filter-dropdown");
    expect(dropdown).toHaveAttribute("data-tag-count", "1");
  });

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
