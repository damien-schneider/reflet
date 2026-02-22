import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateWidget = vi.fn().mockResolvedValue(undefined);
const mockRemoveWidget = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockUpdateWidget),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    widget_admin: {
      update: "widget_admin.update",
      remove: "widget_admin.remove",
    },
  },
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    render: Render,
  }: {
    children?: React.ReactNode;
    render?:
      | React.ReactNode
      | ((props: Record<string, unknown>) => React.ReactNode);
  }) => {
    if (typeof Render === "function") {
      return Render({});
    }
    return <div>{children}</div>;
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick} type="button">
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/typography", () => ({
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  Text: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  Copy: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="copy-icon" />
  ),
  Gear: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Power: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

vi.mock("./widget-settings-dialog", () => ({
  WidgetSettingsDialog: () => null,
}));

import { WidgetCard } from "./widget-card";

afterEach(() => {
  cleanup();
  mockUpdateWidget.mockClear();
  mockRemoveWidget.mockClear();
});

const baseWidget = {
  _id: "w1" as never,
  _creationTime: Date.now(),
  widgetId: "widget-abc-123",
  name: "Support Widget",
  isActive: true,
  organizationId: "org1" as never,
  settings: {
    _id: "ws1" as never,
    _creationTime: Date.now(),
    widgetId: "w1" as never,
    primaryColor: "#5c6d4f",
    position: "bottom-right" as const,
    welcomeMessage: "Hello",
    showLauncher: true,
    autoOpen: false,
    zIndex: 9999,
  },
  conversationCount: 5,
};

describe("WidgetCard", () => {
  it("renders widget name", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Support Widget")).toBeInTheDocument();
  });

  it("renders Active badge when widget is active", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Inactive badge when widget is not active", () => {
    render(
      <WidgetCard orgSlug="test" widget={{ ...baseWidget, isActive: false }} />
    );
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders conversation count", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("5 conversations")).toBeInTheDocument();
  });

  it("renders singular for one conversation", () => {
    render(
      <WidgetCard
        orgSlug="test"
        widget={{ ...baseWidget, conversationCount: 1 }}
      />
    );
    expect(screen.getByText("1 conversation")).toBeInTheDocument();
  });

  it("renders embed code", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Embed Code")).toBeInTheDocument();
    expect(
      screen.getByText(/data-widget-id="widget-abc-123"/)
    ).toBeInTheDocument();
  });

  it("renders Settings dropdown item", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Deactivate option for active widget", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("renders Activate option for inactive widget", () => {
    render(
      <WidgetCard orgSlug="test" widget={{ ...baseWidget, isActive: false }} />
    );
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("renders Delete option", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("renders widget settings color and position", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(screen.getByText("#5c6d4f")).toBeInTheDocument();
    expect(screen.getByText("bottom-right")).toBeInTheDocument();
  });

  it("copies embed code to clipboard on icon click", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    const copyIcon = screen.getByTestId("copy-icon");
    const button = copyIcon.closest("button");
    expect(button).toBeInTheDocument();
    await user.click(button!);
    expect(toast.success).toHaveBeenCalledWith(
      "Embed code copied to clipboard"
    );
  });

  it("calls mutation when Deactivate is clicked", async () => {
    const user = userEvent.setup();
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    await user.click(screen.getByText("Deactivate"));
    expect(mockUpdateWidget).toHaveBeenCalled();
  });

  it("calls mutation when Activate is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WidgetCard orgSlug="test" widget={{ ...baseWidget, isActive: false }} />
    );
    await user.click(screen.getByText("Activate"));
    expect(mockUpdateWidget).toHaveBeenCalled();
  });

  it("opens delete dialog when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    await user.click(screen.getByText("Delete"));
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument();
  });

  it("shows 0 conversations", () => {
    render(
      <WidgetCard
        orgSlug="test"
        widget={{ ...baseWidget, conversationCount: 0 }}
      />
    );
    expect(screen.getByText("0 conversations")).toBeInTheDocument();
  });

  it("renders widget without settings", () => {
    render(
      <WidgetCard
        orgSlug="test"
        widget={{ ...baseWidget, settings: null as never }}
      />
    );
    expect(screen.getByText("Support Widget")).toBeInTheDocument();
  });

  it("shows check icon after copy", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    const user = userEvent.setup();
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    const copyIcon = screen.getByTestId("copy-icon");
    const button = copyIcon.closest("button");
    await user.click(button!);
    await screen.findByTestId("check-icon");
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("renders embed code with correct widget ID", () => {
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    expect(
      screen.getByText(/data-widget-id="widget-abc-123"/)
    ).toBeInTheDocument();
  });

  it("renders multiple conversations plural form", () => {
    render(
      <WidgetCard
        orgSlug="test"
        widget={{ ...baseWidget, conversationCount: 42 }}
      />
    );
    expect(screen.getByText("42 conversations")).toBeInTheDocument();
  });

  it("renders delete confirmation dialog content", async () => {
    const user = userEvent.setup();
    render(<WidgetCard orgSlug="test" widget={baseWidget} />);
    await user.click(screen.getByText("Delete"));
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument();
    expect(screen.getByText("Support Widget")).toBeInTheDocument();
  });
});
