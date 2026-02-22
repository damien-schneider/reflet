import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button data-variant={variant} onClick={onClick} type="button">
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
    onOpenChange: (open: boolean) => void;
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

import { RemoveMemberDialog } from "./remove-member-dialog";

afterEach(cleanup);

describe("RemoveMemberDialog", () => {
  it("does not render when member is null", () => {
    render(
      <RemoveMemberDialog member={null} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByTestId("dialog")).toBeNull();
  });

  it("renders when member is provided", () => {
    render(
      <RemoveMemberDialog
        member={{ id: "m1", name: "John Doe" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Remove member"
    );
  });

  it("displays member name in description", () => {
    render(
      <RemoveMemberDialog
        member={{ id: "m1", name: "Jane Smith" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("calls onClose when Cancel clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={{ id: "m1", name: "John" }}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );
    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onConfirm when Remove member clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={{ id: "m1", name: "John" }}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    // Both buttons have text, get the destructive one
    const buttons = screen.getAllByText("Remove member");
    await user.click(buttons.at(-1));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows Cancel and Remove member buttons in footer", () => {
    render(
      <RemoveMemberDialog
        member={{ id: "m1", name: "John" }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    // Title and button both say "Remove member"
    expect(screen.getAllByText("Remove member")).toHaveLength(2);
  });
});
