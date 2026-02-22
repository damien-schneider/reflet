/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tag-colors", () => ({
  getTagDotColor: (color: string) => color,
}));

vi.mock("@phosphor-icons/react", () => ({
  Funnel: () => <span data-testid="funnel-icon" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    size,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
  }) => (
    <button data-size={size} data-variant={variant} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-list">{children}</div>
  ),
  DropdownListTrigger: ({
    render: renderProp,
  }: {
    render: React.ReactNode;
  }) => <div data-testid="dropdown-trigger">{renderProp}</div>,
  DropdownListContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownListSub: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-sub">{children}</div>
  ),
  DropdownListSubTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-sub-trigger">{children}</div>
  ),
  DropdownListSubContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-sub-content">{children}</div>
  ),
  DropdownListCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div
      data-checked={checked}
      data-testid="checkbox-item"
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={() => {}}
      role="menuitemcheckbox"
    >
      {children}
    </div>
  ),
  DropdownListSeparator: () => <hr data-testid="separator" />,
  DropdownListItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div
      data-testid="dropdown-item"
      onClick={onClick}
      onKeyDown={() => {}}
      role="menuitem"
    >
      {children}
    </div>
  ),
}));

import { FilterDropdown } from "./filter-dropdown";

const baseProps = {
  statuses: [
    { _id: "s1", name: "Open", color: "blue" },
    { _id: "s2", name: "Closed", color: "green" },
  ],
  selectedStatusIds: [] as string[],
  onStatusChange: vi.fn(),
  tags: [
    { _id: "t1", name: "Bug", color: "red" },
    { _id: "t2", name: "Feature", color: "purple" },
  ],
  selectedTagIds: [] as string[],
  onTagChange: vi.fn(),
  hideCompleted: false,
  onHideCompletedToggle: vi.fn(),
  onClearFilters: vi.fn(),
};

describe("FilterDropdown", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the Filter button", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("shows active filter count badge when filters are active", () => {
    render(
      <FilterDropdown
        {...baseProps}
        selectedStatusIds={["s1"]}
        selectedTagIds={["t1"]}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows badge count for hideCompleted", () => {
    render(<FilterDropdown {...baseProps} hideCompleted />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("does not show badge when no filters are active", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders status submenu with status names", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders tag submenu with tag names", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.getByText("Tag")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("hides status submenu when statuses array is empty", () => {
    render(<FilterDropdown {...baseProps} statuses={[]} />);
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("hides tag submenu when tags array is empty", () => {
    render(<FilterDropdown {...baseProps} tags={[]} />);
    expect(screen.queryByText("Tag")).not.toBeInTheDocument();
  });

  it("renders Show completed checkbox item", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.getByText("Show completed")).toBeInTheDocument();
  });

  it("calls onStatusChange when a status checkbox is clicked", () => {
    const onStatusChange = vi.fn();
    render(<FilterDropdown {...baseProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByText("Open"));
    expect(onStatusChange).toHaveBeenCalledWith("s1", true);
  });

  it("calls onTagChange when a tag checkbox is clicked", () => {
    const onTagChange = vi.fn();
    render(<FilterDropdown {...baseProps} onTagChange={onTagChange} />);
    fireEvent.click(screen.getByText("Bug"));
    expect(onTagChange).toHaveBeenCalledWith("t1", true);
  });

  it("calls onHideCompletedToggle when Show completed is clicked", () => {
    const onHideCompletedToggle = vi.fn();
    render(
      <FilterDropdown
        {...baseProps}
        onHideCompletedToggle={onHideCompletedToggle}
      />
    );
    fireEvent.click(screen.getByText("Show completed"));
    expect(onHideCompletedToggle).toHaveBeenCalled();
  });

  it("shows Clear all filters when active filters exist", () => {
    render(<FilterDropdown {...baseProps} selectedStatusIds={["s1"]} />);
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("does not show Clear all filters when no active filters", () => {
    render(<FilterDropdown {...baseProps} />);
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
  });

  it("calls onClearFilters when Clear all filters is clicked", () => {
    const onClearFilters = vi.fn();
    render(
      <FilterDropdown
        {...baseProps}
        onClearFilters={onClearFilters}
        selectedStatusIds={["s1"]}
      />
    );
    fireEvent.click(screen.getByText("Clear all filters"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("marks selected status checkboxes as checked", () => {
    render(<FilterDropdown {...baseProps} selectedStatusIds={["s1"]} />);
    const checkboxItems = screen.getAllByTestId("checkbox-item");
    const openItem = checkboxItems.find((el) =>
      el.textContent?.includes("Open")
    );
    expect(openItem).toHaveAttribute("data-checked", "true");
  });

  it("marks selected tag checkboxes as checked", () => {
    render(<FilterDropdown {...baseProps} selectedTagIds={["t2"]} />);
    const checkboxItems = screen.getAllByTestId("checkbox-item");
    const featureItem = checkboxItems.find((el) =>
      el.textContent?.includes("Feature")
    );
    expect(featureItem).toHaveAttribute("data-checked", "true");
  });

  it("uses secondary variant on button when filters are active", () => {
    render(<FilterDropdown {...baseProps} selectedStatusIds={["s1"]} />);
    const button = screen.getByText("Filter").closest("button");
    expect(button).toHaveAttribute("data-variant", "secondary");
  });

  it("uses outline variant on button when no filters active", () => {
    render(<FilterDropdown {...baseProps} />);
    const button = screen.getByText("Filter").closest("button");
    expect(button).toHaveAttribute("data-variant", "outline");
  });

  it("computes activeCount correctly with all filter types", () => {
    render(
      <FilterDropdown
        {...baseProps}
        hideCompleted
        selectedStatusIds={["s1", "s2"]}
        selectedTagIds={["t1"]}
      />
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
