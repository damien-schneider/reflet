import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback_api_admin: {
      generateApiKeys: "feedback_api_admin:generateApiKeys",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Copy: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="copy-icon" />
  ),
  Key: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="key-icon" />
  ),
  Robot: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="robot-icon" />
  ),
  Warning: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="warning-icon" />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className={className}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      {...props}
    />
  ),
}));

vi.mock("../lib/generate-changelog-widget-prompt", () => ({
  generateChangelogWidgetPrompt: (key: string) => `MOCK_PROMPT_${key}`,
}));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
});

import { toast } from "sonner";
import { ChangelogWidgetTab } from "./changelog-widget-tab";

const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("ChangelogWidgetTab", () => {
  const mockGenerateKeys = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    publicKey: "pk_test_123",
    hasApiKeys: true,
    organizationId: ORG_ID,
    orgSlug: "test-org",
  };

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockGenerateKeys);
  });

  it("renders embed configuration section", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("Embed Configuration")).toBeInTheDocument();
  });

  it("renders script tag section", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("Script Tag")).toBeInTheDocument();
  });

  it("renders react SDK section", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("React SDK")).toBeInTheDocument();
  });

  it("renders AI integration prompt section", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("AI Integration Prompt")).toBeInTheDocument();
  });

  it("does not show API keys warning when hasApiKeys is true", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.queryByText("API keys required")).not.toBeInTheDocument();
  });

  it("shows API keys warning when hasApiKeys is false", () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    expect(screen.getByText("API keys required")).toBeInTheDocument();
  });

  it("shows generate API keys button when no keys", () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    expect(screen.getByText("Generate API Keys")).toBeInTheDocument();
  });

  it("calls generateApiKeys mutation on button click", async () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    fireEvent.click(screen.getByText("Generate API Keys"));
    expect(mockGenerateKeys).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: "Default",
    });
  });

  it("uses custom key name when provided", () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    const input = screen.getByPlaceholderText("Key name (e.g., Production)");
    fireEvent.change(input, { target: { value: "My Key" } });
    fireEvent.click(screen.getByText("Generate API Keys"));
    expect(mockGenerateKeys).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: "My Key",
    });
  });

  it("includes public key in script embed code", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(
      screen.getByText(/data-public-key="pk_test_123"/)
    ).toBeInTheDocument();
  });

  it("includes public key in react code", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText(/publicKey="pk_test_123"/)).toBeInTheDocument();
  });

  it("handles copy to clipboard", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const copyButtons = screen.getAllByText("Copy");
    fireEvent.click(copyButtons[0]);
    expect(mockWriteText).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      "Script tag copied to clipboard"
    );
  });

  it("copies React code to clipboard", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const copyButtons = screen.getAllByText("Copy");
    fireEvent.click(copyButtons[1]);
    expect(mockWriteText).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      "React code copied to clipboard"
    );
  });

  it("renders mode dropdown with default card value", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const modeSelect = screen.getByLabelText("Mode") as HTMLSelectElement;
    expect(modeSelect.value).toBe("card");
  });

  it("changes mode when selecting popup", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const modeSelect = screen.getByLabelText("Mode");
    fireEvent.change(modeSelect, { target: { value: "popup" } });
    expect((modeSelect as HTMLSelectElement).value).toBe("popup");
  });

  it("shows trigger element section when mode is trigger", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.queryByText("Trigger Element")).not.toBeInTheDocument();
    const modeSelect = screen.getByLabelText("Mode");
    fireEvent.change(modeSelect, { target: { value: "trigger" } });
    expect(screen.getByText("Trigger Element")).toBeInTheDocument();
  });

  it("disables position select when mode is trigger", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const modeSelect = screen.getByLabelText("Mode");
    fireEvent.change(modeSelect, { target: { value: "trigger" } });
    expect(screen.getByLabelText("Position")).toBeDisabled();
  });

  it("renders theme selector", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const themeSelect = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(themeSelect.value).toBe("auto");
  });

  it("applies custom primary color", () => {
    render(<ChangelogWidgetTab {...defaultProps} primaryColor="#ff0000" />);
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
  });

  it("shows default color when no primary color provided", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("#5c6d4f")).toBeInTheDocument();
  });

  it("links to branding settings page", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText("Change in branding settings")).toBeInTheDocument();
  });

  it("copies AI prompt to clipboard", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Copy Full AI Prompt"));
    expect(mockWriteText).toHaveBeenCalledWith("MOCK_PROMPT_pk_test_123");
    expect(mockToast.success).toHaveBeenCalledWith(
      "AI prompt copied to clipboard"
    );
  });

  it("renders mode description text for card mode", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(
      screen.getByText("Floating notification card in corner")
    ).toBeInTheDocument();
  });

  it("changes position dropdown value", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const posSelect = screen.getByLabelText("Position") as HTMLSelectElement;
    expect(posSelect.value).toBe("bottom-right");
    fireEvent.change(posSelect, { target: { value: "bottom-left" } });
    expect(posSelect.value).toBe("bottom-left");
  });
});
