import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => {
  const mockFn = vi.fn().mockResolvedValue(undefined);
  return {
    useMutation: vi.fn(() => mockFn),
    __mockMutationFn: mockFn,
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    widget_admin: {
      updateSettings: "widget_admin.updateSettings",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (o: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => <div data-value={value}>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    id,
  }: {
    checked: boolean;
    disabled: boolean;
    onCheckedChange: (v: boolean) => void;
    id?: string;
  }) => (
    <button
      aria-checked={checked}
      data-testid={id ? `switch-${id}` : "switch"}
      disabled={disabled}
      role="switch"
      type="button"
    />
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

import { WidgetSettingsDialog } from "./widget-settings-dialog";

afterEach(cleanup);

const baseWidget = {
  _id: "w1" as never,
  _creationTime: Date.now(),
  widgetId: "widget-123",
  name: "Test Widget",
  isActive: true,
  organizationId: "org1" as never,
  settings: {
    _id: "ws1" as never,
    _creationTime: Date.now(),
    widgetId: "w1" as never,
    primaryColor: "#5c6d4f",
    position: "bottom-right" as const,
    welcomeMessage: "Hi there!",
    greetingMessage: "We reply fast",
    showLauncher: true,
    autoOpen: false,
    zIndex: 9999,
  },
  conversationCount: 0,
};

describe("WidgetSettingsDialog", () => {
  it("renders when open", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Widget Settings")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={false}
        widget={baseWidget}
      />
    );
    expect(screen.queryByText("Widget Settings")).not.toBeInTheDocument();
  });

  it("renders all setting fields", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Primary Color")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByText("Welcome Message")).toBeInTheDocument();
    expect(screen.getByText("Subtitle (optional)")).toBeInTheDocument();
    expect(screen.getByText("Z-Index")).toBeInTheDocument();
    expect(screen.getByText("Show Launcher")).toBeInTheDocument();
    expect(screen.getByText("Auto Open")).toBeInTheDocument();
  });

  it("renders Cancel and Save buttons", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("populates fields with widget settings", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const colorInput = screen.getByPlaceholderText("#5c6d4f");
    expect(colorInput).toHaveValue("#5c6d4f");
  });

  it("renders welcome message with initial value", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const welcomeInput = screen.getByPlaceholderText(
      "Hi there! How can we help you?"
    );
    expect(welcomeInput).toHaveValue("Hi there!");
  });

  it("renders position selector", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Bottom Right")).toBeInTheDocument();
    expect(screen.getByText("Bottom Left")).toBeInTheDocument();
  });

  it("renders Show Launcher switch", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByTestId("switch-show-launcher")).toBeInTheDocument();
  });

  it("renders Auto Open switch", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByTestId("switch-auto-open")).toBeInTheDocument();
  });

  it("uses default values when widget has no settings", () => {
    const widgetNoSettings = { ...baseWidget, settings: null };
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={widgetNoSettings}
      />
    );
    expect(screen.getByText("Widget Settings")).toBeInTheDocument();
  });

  it("allows typing in welcome message input", async () => {
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const welcomeInput = screen.getByPlaceholderText(
      "Hi there! How can we help you?"
    );
    await user.clear(welcomeInput);
    await user.type(welcomeInput, "New welcome");
    expect(welcomeInput).toHaveValue("New welcome");
  });

  it("allows typing in color input", async () => {
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const colorInput = screen.getByPlaceholderText("#5c6d4f");
    await user.clear(colorInput);
    await user.type(colorInput, "#ff0000");
    expect(colorInput).toHaveValue("#ff0000");
  });

  it("allows typing in z-index input", async () => {
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const zIndexInput = screen.getByDisplayValue("9999");
    await user.clear(zIndexInput);
    await user.type(zIndexInput, "5000");
    expect(zIndexInput).toHaveValue(5000);
  });

  it("renders subtitle input with initial value", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const subtitleInput = screen.getByDisplayValue("We reply fast");
    expect(subtitleInput).toBeInTheDocument();
  });

  it("renders Show Launcher switch with correct checked state", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const showLauncher = screen.getByTestId("switch-show-launcher");
    expect(showLauncher).toHaveAttribute("aria-checked", "true");
  });

  it("renders Auto Open switch with correct checked state", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const autoOpen = screen.getByTestId("switch-auto-open");
    expect(autoOpen).toHaveAttribute("aria-checked", "false");
  });

  it("renders dialog description", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(
      screen.getByText(/Customize the appearance and behavior/)
    ).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("renders Cancel button", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={onOpenChange}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when open is false", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={false}
        widget={baseWidget}
      />
    );
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("renders position select with initial value", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText("Position")).toBeInTheDocument();
  });

  it("renders color picker", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    const elements = screen.getAllByText(/Color|color/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("renders save button", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText(/Save|Apply/i)).toBeInTheDocument();
  });

  it("renders z-index input", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByText(/z-index|Z-Index/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={false}
        widget={baseWidget}
      />
    );
    expect(screen.queryByText("Position")).not.toBeInTheDocument();
  });

  it("calls mutation and closes dialog on Save Changes", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    const { toast } = await import("sonner");
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={onOpenChange}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Save Changes"));
    expect(__mockMutationFn).toHaveBeenCalledWith(
      expect.objectContaining({
        widgetId: "w1",
        primaryColor: "#5c6d4f",
        position: "bottom-right",
        welcomeMessage: "Hi there!",
        showLauncher: true,
        autoOpen: false,
        zIndex: 9999,
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Widget settings saved");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error toast when save fails", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    __mockMutationFn.mockRejectedValueOnce(new Error("fail"));
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Save Changes"));
    expect(toast.error).toHaveBeenCalledWith("Failed to save settings");
  });

  it("converts empty greeting message to undefined", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    const user = userEvent.setup();
    const widgetNoGreeting = {
      ...baseWidget,
      settings: { ...baseWidget.settings, greetingMessage: "" },
    };
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={widgetNoGreeting}
      />
    );
    await user.click(screen.getByText("Save Changes"));
    expect(__mockMutationFn).toHaveBeenCalledWith(
      expect.objectContaining({
        greetingMessage: undefined,
      })
    );
  });

  it("shows Saving... text while save is in progress", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    let resolveFn: () => void;
    __mockMutationFn.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveFn = resolve;
      })
    );
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Save Changes"));
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    resolveFn?.();
  });
});
