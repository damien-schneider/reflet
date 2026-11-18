import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => {
  const mockFn = vi.fn().mockResolvedValue(undefined);
  return {
    __mockMutationFn: mockFn,
    useMutation: vi.fn(() => mockFn),
  };
});

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    widget: {
      admin_settings: {
        updateSettings: "widget_admin_settings.updateSettings",
      },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (o: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@ctrl-ui/react/ui/select", () => ({
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

vi.mock("@ctrl-ui/react/ui/switch", () => ({
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

import { WidgetSettingsDialog } from "./widget-settings-dialog";

const baseWidget = {
  _creationTime: Date.now(),
  _id: "w1" as never,
  conversationCount: 0,
  isActive: true,
  name: "Test Widget",
  organizationId: "org1" as never,
  settings: {
    _creationTime: Date.now(),
    _id: "ws1" as never,
    autoOpen: false,
    greetingMessage: "We reply fast",
    position: "bottom-right" as const,
    primaryColor: "#5c6d4f",
    showLauncher: true,
    welcomeMessage: "Hi there!",
    widgetId: "w1" as never,
    zIndex: 9999,
  },
  widgetId: "widget-123",
};

describe("WidgetSettingsDialog", () => {
  it("populates fields with widget settings", () => {
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    expect(screen.getByLabelText("Primary color")).toHaveValue("#5c6d4f");
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
    expect(screen.getByText("Chat settings")).toBeInTheDocument();
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

  it("calls mutation and closes dialog on Save changes", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    const { toast } = await import("@ctrl-ui/react/ui/toast");
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={onOpenChange}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Save changes"));
    expect(__mockMutationFn).toHaveBeenCalledWith(
      expect.objectContaining({
        autoOpen: false,
        position: "bottom-right",
        primaryColor: "#5c6d4f",
        showLauncher: true,
        welcomeMessage: "Hi there!",
        widgetId: "w1",
        zIndex: 9999,
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Chat settings saved");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error toast when save fails", async () => {
    const { __mockMutationFn } = (await import("convex/react")) as {
      __mockMutationFn: ReturnType<typeof vi.fn>;
    };
    __mockMutationFn.mockRejectedValueOnce(new Error("fail"));
    const { toast } = await import("@ctrl-ui/react/ui/toast");
    const user = userEvent.setup();
    render(
      <WidgetSettingsDialog
        onOpenChange={vi.fn()}
        open={true}
        widget={baseWidget}
      />
    );
    await user.click(screen.getByText("Save changes"));
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn’t save settings. Try again."
    );
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
    await user.click(screen.getByText("Save changes"));
    expect(__mockMutationFn).toHaveBeenCalledWith(
      expect.objectContaining({
        greetingMessage: undefined,
      })
    );
  });

  it("shows Saving… text while save is in progress", async () => {
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
    await user.click(screen.getByText("Save changes"));
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    resolveFn?.();
  });
});
