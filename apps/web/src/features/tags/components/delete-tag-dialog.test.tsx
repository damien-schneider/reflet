import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    tag_manager_actions: {
      remove: "tag_manager_actions:remove",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button data-variant={variant} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (val: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

import { DeleteTagDialog } from "./delete-tag-dialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeleteTagDialog", () => {
  const mockDeleteTag = vi.fn().mockResolvedValue(undefined);
  const defaultProps = {
    tagId: "tag1" as Id<"tags">,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockDeleteTag);
  });

  it("renders dialog when tagId is provided", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("does not render dialog when tagId is null", () => {
    render(<DeleteTagDialog {...defaultProps} tagId={null} />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("displays correct title", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Delete tag");
  });

  it("displays warning description", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Are you sure you want to delete this tag?"
    );
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "removed from all feedback items"
    );
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "cannot be undone"
    );
  });

  it("renders Cancel and Delete buttons", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    render(<DeleteTagDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls deleteTag mutation when Delete is clicked", async () => {
    render(<DeleteTagDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDeleteTag).toHaveBeenCalledWith({ id: "tag1" });
  });

  it("calls onSuccess after successful deletion", async () => {
    const onSuccess = vi.fn();
    render(<DeleteTagDialog {...defaultProps} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText("Delete"));
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("does not call deleteTag when tagId is null and Delete is somehow clicked", async () => {
    // Edge case: should not happen in practice but tests guard
    render(<DeleteTagDialog {...defaultProps} tagId={null} />);
    // Dialog won't render, so delete can't be clicked
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("has destructive variant on Delete button", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByText("Delete")).toHaveAttribute(
      "data-variant",
      "destructive"
    );
  });

  it("has outline variant on Cancel button", () => {
    render(<DeleteTagDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toHaveAttribute(
      "data-variant",
      "outline"
    );
  });
});
