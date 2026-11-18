import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/dialog", () => ({
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

describe("RemoveMemberDialog", () => {
  it("does not render when member is null", () => {
    render(
      <RemoveMemberDialog member={null} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByTestId("dialog")).toBeNull();
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
});
