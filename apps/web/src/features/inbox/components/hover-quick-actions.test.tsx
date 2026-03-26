import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    render: renderEl,
    ...props
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) =>
    renderEl ? (
      React.cloneElement(renderEl, props, children)
    ) : (
      <span {...props}>{children}</span>
    ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: () => <svg data-testid="icon-resolve" />,
  XCircle: () => <svg data-testid="icon-close" />,
  UserCirclePlus: () => <svg data-testid="icon-assign" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { HoverQuickActions } from "./hover-quick-actions";

afterEach(cleanup);

describe("HoverQuickActions", () => {
  it("renders resolve, close, and assign buttons", () => {
    render(
      <HoverQuickActions
        onAssignToMe={vi.fn()}
        onClose={vi.fn()}
        onResolve={vi.fn()}
      />
    );
    expect(screen.getByTestId("icon-resolve")).toBeInTheDocument();
    expect(screen.getByTestId("icon-close")).toBeInTheDocument();
    expect(screen.getByTestId("icon-assign")).toBeInTheDocument();
  });

  it("calls onResolve when resolve button is clicked", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <HoverQuickActions
        onAssignToMe={vi.fn()}
        onClose={vi.fn()}
        onResolve={onResolve}
      />
    );
    const button = screen.getByTestId("icon-resolve").closest("button");
    if (button) {
      await user.click(button);
    }
    expect(onResolve).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <HoverQuickActions
        onAssignToMe={vi.fn()}
        onClose={onClose}
        onResolve={vi.fn()}
      />
    );
    const button = screen.getByTestId("icon-close").closest("button");
    if (button) {
      await user.click(button);
    }
    expect(onClose).toHaveBeenCalledOnce();
  });
});
