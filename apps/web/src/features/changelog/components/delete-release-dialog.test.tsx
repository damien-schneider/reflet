import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { DeleteReleaseDialog } from "./delete-release-dialog";

afterEach(cleanup);

describe("DeleteReleaseDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  it("renders the dialog when open is true", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Delete release"
    );
  });

  it("does not render when open is false", () => {
    render(<DeleteReleaseDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("displays the confirmation message", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "Are you sure you want to delete this release?"
    );
    expect(screen.getByTestId("dialog-description")).toHaveTextContent(
      "cannot be undone"
    );
  });

  it("renders Cancel and Delete buttons", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<DeleteReleaseDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onConfirm when Delete is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteReleaseDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("has destructive variant on Delete button", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByText("Delete")).toHaveAttribute(
      "data-variant",
      "destructive"
    );
  });

  it("has outline variant on Cancel button", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toHaveAttribute(
      "data-variant",
      "outline"
    );
  });
});
