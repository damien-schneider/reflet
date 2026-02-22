import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => async (values: Record<string, unknown>) => ({
    values,
    errors: {},
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: string;
  }) => (
    <button disabled={disabled} type={type as "button" | "submit"}>
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
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/features/account/password-input-field", () => ({
  PasswordInputField: ({
    id,
    label,
    placeholder,
    showPassword,
    onTogglePassword,
  }: {
    id: string;
    label: string;
    placeholder?: string;
    showPassword?: boolean;
    onTogglePassword?: () => void;
    register?: unknown;
    error?: unknown;
  }) => (
    <div data-testid={`password-field-${id}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        placeholder={placeholder}
        type={showPassword ? "text" : "password"}
      />
      {onTogglePassword ? (
        <button
          data-testid={`toggle-${id}`}
          onClick={onTogglePassword}
          type="button"
        >
          toggle
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

import { PasswordSection } from "./password-section";

afterEach(cleanup);

describe("PasswordSection", () => {
  it("renders card title", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("renders card description", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Change your password")).toBeInTheDocument();
  });

  it("renders all three password fields", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(
      screen.getByTestId("password-field-currentPassword")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("password-field-newPassword")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("password-field-confirmPassword")
    ).toBeInTheDocument();
  });

  it("renders password hint text", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
  });

  it("renders Update Password button", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("disables button when isLoading is true", () => {
    render(<PasswordSection isLoading={true} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Update Password")).toBeDisabled();
  });

  it("renders all password field labels", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(screen.getByText("New Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm New Password")).toBeInTheDocument();
  });

  it("renders password field placeholders", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Enter your current password")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your new password")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Confirm your new password")
    ).toBeInTheDocument();
  });

  it("allows typing in password inputs", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    const currentInput = screen.getByPlaceholderText(
      "Enter your current password"
    );
    await user.type(currentInput, "oldpass");
    expect(currentInput).toHaveValue("oldpass");
  });

  it("submits form and calls authClient.changePassword", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const setIsLoading = vi.fn();
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={setIsLoading} />);
    await user.type(
      screen.getByPlaceholderText("Enter your current password"),
      "oldpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm your new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Update Password"));
    expect(authClient.changePassword).toHaveBeenCalled();
  });

  it("shows error toast on password change failure", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const { toast } = await import("sonner");
    vi.mocked(authClient.changePassword).mockRejectedValueOnce(
      new Error("Wrong password")
    );
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await user.type(
      screen.getByPlaceholderText("Enter your current password"),
      "wrongpass1"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm your new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Update Password"));
    expect(toast.error).toHaveBeenCalledWith("Wrong password");
  });

  it("renders card with proper structure", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Change your password")).toBeInTheDocument();
  });

  it("button has submit type", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(
      screen.getByText("Update Password").closest("button")
    ).toHaveAttribute("type", "submit");
  });

  it("enables button when isLoading is false", () => {
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    expect(screen.getByText("Update Password")).not.toBeDisabled();
  });

  it("shows success toast on successful password change", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const { toast } = await import("sonner");
    vi.mocked(authClient.changePassword).mockResolvedValueOnce({} as never);
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await user.type(
      screen.getByPlaceholderText("Enter your current password"),
      "oldpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm your new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Update Password"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows generic error toast for non-Error exceptions", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const { toast } = await import("sonner");
    vi.mocked(authClient.changePassword).mockRejectedValueOnce("string error");
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    await user.type(
      screen.getByPlaceholderText("Enter your current password"),
      "wrongpass1"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm your new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Update Password"));
    expect(toast.error).toHaveBeenCalledWith("Failed to update password");
  });

  it("calls setIsLoading(true) then setIsLoading(false) on submit", async () => {
    const { authClient } = await import("@/lib/auth-client");
    vi.mocked(authClient.changePassword).mockResolvedValueOnce({} as never);
    const setIsLoading = vi.fn();
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={setIsLoading} />);
    await user.type(
      screen.getByPlaceholderText("Enter your current password"),
      "oldpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm your new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Update Password"));
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it("toggles current password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    const currentInput = screen.getByPlaceholderText(
      "Enter your current password"
    );
    expect(currentInput).toHaveAttribute("type", "password");
    await user.click(screen.getByTestId("toggle-currentPassword"));
    expect(currentInput).toHaveAttribute("type", "text");
  });

  it("toggles new password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    const newInput = screen.getByPlaceholderText("Enter your new password");
    expect(newInput).toHaveAttribute("type", "password");
    await user.click(screen.getByTestId("toggle-newPassword"));
    expect(newInput).toHaveAttribute("type", "text");
  });

  it("toggles confirm password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordSection isLoading={false} setIsLoading={vi.fn()} />);
    const confirmInput = screen.getByPlaceholderText(
      "Confirm your new password"
    );
    expect(confirmInput).toHaveAttribute("type", "password");
    await user.click(screen.getByTestId("toggle-confirmPassword"));
    expect(confirmInput).toHaveAttribute("type", "text");
  });
});
