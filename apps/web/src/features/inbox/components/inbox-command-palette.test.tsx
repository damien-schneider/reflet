import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/command", () => ({
  Command: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="command-dialog">
        <button
          data-testid="close-dialog"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          Close
        </button>
        {children}
      </div>
    ) : null,
  CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="command-input" {...props} />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading?: string;
  }) => <div data-testid={`group-${heading}`}>{children}</div>,
  CommandItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  } & Record<string, unknown>) => (
    <button onClick={onSelect} type="button" {...props}>
      {children}
    </button>
  ),
  CommandShortcut: ({ children }: { children: React.ReactNode }) => (
    <kbd>{children}</kbd>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: () => <svg />,
  XCircle: () => <svg />,
  MagnifyingGlass: () => <svg />,
  Gear: () => <svg />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { InboxCommandPalette } from "./inbox-command-palette";

afterEach(cleanup);

describe("InboxCommandPalette", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onResolve: vi.fn(),
    onClose: vi.fn(),
    onToggleSupport: vi.fn(),
    hasSelectedConversation: true,
    supportEnabled: false,
  };

  it("renders command dialog when open", () => {
    render(<InboxCommandPalette {...defaultProps} />);
    expect(screen.getByTestId("command-dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<InboxCommandPalette {...defaultProps} open={false} />);
    expect(screen.queryByTestId("command-dialog")).toBeNull();
  });

  it("shows conversation actions when a conversation is selected", () => {
    render(<InboxCommandPalette {...defaultProps} />);
    expect(screen.getByText("Resolve conversation")).toBeInTheDocument();
    expect(screen.getByText("Close conversation")).toBeInTheDocument();
  });

  it("shows toggle support action with current state", () => {
    render(<InboxCommandPalette {...defaultProps} supportEnabled={false} />);
    expect(screen.getByText("Enable public support page")).toBeInTheDocument();
  });
});
