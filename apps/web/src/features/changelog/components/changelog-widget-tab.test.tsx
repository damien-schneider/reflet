import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      api_admin: {
        generateApiKeys: "feedback_api_admin:generateApiKeys",
      },
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
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
  WarningCircle: ({ className }: { className?: string }) => (
    <svg className={className} />
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

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/input", () => ({
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

import { toast } from "@ctrl-ui/react/ui/toast";
import { ChangelogWidgetTab } from "./changelog-widget-tab";

const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

afterEach(() => {
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("ChangelogWidgetTab", () => {
  const mockGenerateKeys = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    hasApiKeys: true,
    organizationId: ORG_ID,
    orgSlug: "test-org",
    publicKey: "pk_test_123",
  };

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockGenerateKeys);
  });

  it("does not show API keys warning when hasApiKeys is true", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.queryByText("API keys required")).not.toBeInTheDocument();
  });

  it("calls generateApiKeys mutation on button click", async () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    fireEvent.click(screen.getByText("Generate API keys"));
    expect(mockGenerateKeys).toHaveBeenCalledWith({
      name: "Default",
      organizationId: ORG_ID,
    });
  });

  it("uses custom key name when provided", () => {
    render(<ChangelogWidgetTab {...defaultProps} hasApiKeys={false} />);
    const input = screen.getByPlaceholderText("Key name (e.g. Production)");
    fireEvent.change(input, { target: { value: "My Key" } });
    fireEvent.click(screen.getByText("Generate API keys"));
    expect(mockGenerateKeys).toHaveBeenCalledWith({
      name: "My Key",
      organizationId: ORG_ID,
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

  it("copies the script tag", async () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy script tag" }));
    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('data-public-key="pk_test_123"')
    );
    expect(await screen.findByText("Copied to clipboard")).toBeInTheDocument();
  });

  it("copies the React code", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy React code" }));
    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("<ChangelogWidget")
    );
  });

  it("puts the chosen mode in the embed code", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "popup" },
    });
    expect(screen.getByText(/data-mode="popup"/)).toBeInTheDocument();
  });

  it("shows trigger element section when mode is trigger", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.queryByText("Trigger element")).not.toBeInTheDocument();
    const modeSelect = screen.getByLabelText("Mode");
    fireEvent.change(modeSelect, { target: { value: "trigger" } });
    expect(screen.getByText("Trigger element")).toBeInTheDocument();
  });

  it("disables position select when mode is trigger", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    const modeSelect = screen.getByLabelText("Mode");
    fireEvent.change(modeSelect, { target: { value: "trigger" } });
    expect(screen.getByLabelText("Position")).toBeDisabled();
  });

  it("applies custom primary color", () => {
    render(<ChangelogWidgetTab {...defaultProps} primaryColor="#ff0000" />);
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
  });

  it("shows default color when no primary color provided", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    expect(screen.getByText(DEFAULT_PRIMARY_COLOR)).toBeInTheDocument();
  });

  it("copies AI prompt to clipboard", async () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Copy full AI prompt"));
    expect(mockWriteText).toHaveBeenCalledWith("MOCK_PROMPT_pk_test_123");
    await vi.waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "AI prompt copied to clipboard"
      )
    );
  });

  it("puts the chosen position in the embed code", () => {
    render(<ChangelogWidgetTab {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Position"), {
      target: { value: "bottom-left" },
    });
    expect(screen.getByText(/data-position="bottom-left"/)).toBeInTheDocument();
  });
});
