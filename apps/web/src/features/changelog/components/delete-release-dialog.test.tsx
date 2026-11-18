import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    tone,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: string;
    variant?: string;
  }) => (
    <button
      data-tone={tone}
      data-variant={variant}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@ctrl-ui/react/ui/alert-dialog", () => ({
  AlertDialog: ({
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
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

import { DeleteReleaseDialog } from "./delete-release-dialog";

describe("DeleteReleaseDialog", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    open: true,
  };

  it("renders the dialog when open is true", () => {
    render(<DeleteReleaseDialog {...defaultProps} />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Delete this release?"
    );
  });

  it("names the release in the title when provided", () => {
    render(<DeleteReleaseDialog {...defaultProps} releaseTitle="v2 launch" />);
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Delete “v2 launch”?"
    );
  });

  it("disables both actions while the delete is pending", async () => {
    let resolveDelete: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );
    render(<DeleteReleaseDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Delete release"));
    expect(screen.getByText("Delete release")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
    resolveDelete();
    await waitFor(() =>
      expect(screen.getByText("Delete release")).not.toBeDisabled()
    );
  });
});
