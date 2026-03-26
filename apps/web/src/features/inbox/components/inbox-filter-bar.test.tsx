import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="toggle-group" {...props}>
      {children}
    </div>
  ),
  ToggleGroupItem: ({
    children,
    value,
    pressed,
    onPressedChange,
  }: {
    children: React.ReactNode;
    value: string;
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      aria-pressed={pressed}
      data-testid={`filter-${value}`}
      onClick={() => onPressedChange?.(!pressed)}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  H1: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  Muted: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@phosphor-icons/react", () => ({
  MagnifyingGlass: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="search-icon" />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { type ConversationStatus, InboxFilterBar } from "./inbox-filter-bar";

afterEach(cleanup);

describe("InboxFilterBar", () => {
  const defaultProps = {
    statusFilter: ["open", "awaiting_reply"] satisfies ConversationStatus[],
    onToggleStatusFilter: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
  };

  it("renders all four status filter pills", () => {
    render(<InboxFilterBar {...defaultProps} />);
    expect(screen.getByTestId("filter-open")).toBeInTheDocument();
    expect(screen.getByTestId("filter-awaiting_reply")).toBeInTheDocument();
    expect(screen.getByTestId("filter-resolved")).toBeInTheDocument();
    expect(screen.getByTestId("filter-closed")).toBeInTheDocument();
  });

  it("marks active filters as pressed", () => {
    render(<InboxFilterBar {...defaultProps} />);
    expect(screen.getByTestId("filter-open").getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(
      screen.getByTestId("filter-resolved").getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("calls onToggleStatusFilter when a pill is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <InboxFilterBar {...defaultProps} onToggleStatusFilter={onToggle} />
    );
    await user.click(screen.getByTestId("filter-resolved"));
    expect(onToggle).toHaveBeenCalledWith("resolved");
  });

  it("renders a search input", () => {
    render(<InboxFilterBar {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search conversations...")
    ).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in search", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<InboxFilterBar {...defaultProps} onSearchChange={onSearch} />);
    await user.type(
      screen.getByPlaceholderText("Search conversations..."),
      "billing"
    );
    expect(onSearch).toHaveBeenCalled();
  });

  it("renders children (settings popover slot)", () => {
    render(
      <InboxFilterBar {...defaultProps}>
        <button data-testid="settings-btn" type="button">
          Settings
        </button>
      </InboxFilterBar>
    );
    expect(screen.getByTestId("settings-btn")).toBeInTheDocument();
  });
});
