import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  DotsThreeVertical: () => <svg data-testid="dots-icon" />,
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trash-icon" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <h3 className={className} data-testid="card-title">
      {children}
    </h3>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown">{children}</div>
  ),
  DropdownListContent: ({
    children,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownListItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      className={className}
      data-testid="dropdown-item"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
  DropdownListTrigger: ({
    render,
  }: {
    render: (props: React.ComponentProps<"button">) => React.ReactNode;
  }) => <>{render({})}</>,
}));

vi.mock("@/lib/tag-colors", () => ({
  getTagSwatchClass: (color: string) => `swatch-${color}`,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { TagCard } from "./tag-card";

afterEach(cleanup);

describe("TagCard", () => {
  const defaultTag = {
    _id: "tag1" as Id<"tags">,
    name: "Bug",
    color: "red",
  };

  const defaultProps = {
    tag: defaultTag,
    isAdmin: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renders the card", () => {
    render(<TagCard {...defaultProps} />);
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("displays the tag name", () => {
    render(<TagCard {...defaultProps} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("renders the color swatch with correct class", () => {
    const { container } = render(<TagCard {...defaultProps} />);
    const swatch = container.querySelector(".swatch-red");
    expect(swatch).toBeInTheDocument();
  });

  it("does not show dropdown menu when not admin", () => {
    render(<TagCard {...defaultProps} />);
    expect(screen.queryByTestId("dropdown")).not.toBeInTheDocument();
  });

  it("shows dropdown menu when isAdmin is true", () => {
    render(<TagCard {...defaultProps} isAdmin />);
    expect(screen.getByTestId("dropdown")).toBeInTheDocument();
  });

  it("shows Edit option in admin dropdown", () => {
    render(<TagCard {...defaultProps} isAdmin />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("shows Delete option in admin dropdown", () => {
    render(<TagCard {...defaultProps} isAdmin />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<TagCard {...defaultProps} isAdmin onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onDelete when Delete is clicked", () => {
    const onDelete = vi.fn();
    render(<TagCard {...defaultProps} isAdmin onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("renders with different tag data", () => {
    const tag = {
      _id: "tag2" as Id<"tags">,
      name: "Feature",
      color: "blue",
    };
    render(<TagCard {...defaultProps} tag={tag} />);
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("applies destructive class to delete option", () => {
    render(<TagCard {...defaultProps} isAdmin />);
    const items = screen.getAllByTestId("dropdown-item");
    const deleteItem = items.find((item) =>
      item.textContent?.includes("Delete")
    );
    expect(deleteItem).toHaveClass("text-destructive");
  });

  it("shows trash icon in delete option", () => {
    render(<TagCard {...defaultProps} isAdmin />);
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });
});
