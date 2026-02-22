import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  FieldError: ({ errors }: { errors?: Array<{ message?: string }> }) =>
    errors ? (
      <span data-testid="field-error">
        {errors.map((e) => e.message).join(", ")}
      </span>
    ) : null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    ref: _ref,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: unknown }) => (
    <input {...props} />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Eye: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="eye-icon" />
  ),
  EyeSlash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="eye-slash-icon" />
  ),
}));

import { PasswordInputField } from "./password-input-field";

afterEach(cleanup);

const baseProps = {
  id: "test-password",
  label: "Password",
  showPassword: false,
  onTogglePassword: vi.fn(),
  register: {
    name: "test-password" as const,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  },
  placeholder: "Enter password",
};

describe("PasswordInputField", () => {
  it("renders label", () => {
    render(<PasswordInputField {...baseProps} />);
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("renders input with placeholder", () => {
    render(<PasswordInputField {...baseProps} />);
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("renders password type input when showPassword is false", () => {
    render(<PasswordInputField {...baseProps} />);
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("renders text type input when showPassword is true", () => {
    render(<PasswordInputField {...baseProps} showPassword={true} />);
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute(
      "type",
      "text"
    );
  });

  it("shows Eye icon when password is hidden", () => {
    render(<PasswordInputField {...baseProps} showPassword={false} />);
    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
  });

  it("shows EyeSlash icon when password is visible", () => {
    render(<PasswordInputField {...baseProps} showPassword={true} />);
    expect(screen.getByTestId("eye-slash-icon")).toBeInTheDocument();
  });

  it("calls onTogglePassword when toggle button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<PasswordInputField {...baseProps} onTogglePassword={onToggle} />);

    const toggleButton = screen.getByRole("button");
    await user.click(toggleButton);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders error message when error is provided", () => {
    render(
      <PasswordInputField
        {...baseProps}
        error={{ message: "Password too short" }}
      />
    );
    expect(screen.getByTestId("field-error")).toHaveTextContent(
      "Password too short"
    );
  });

  it("does not render error when no error", () => {
    render(<PasswordInputField {...baseProps} />);
    expect(screen.queryByTestId("field-error")).not.toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<PasswordInputField {...baseProps} placeholder="Enter secret" />);
    expect(screen.getByPlaceholderText("Enter secret")).toBeInTheDocument();
  });

  it("renders label text", () => {
    render(<PasswordInputField {...baseProps} label="Secret Key" />);
    expect(screen.getByText("Secret Key")).toBeInTheDocument();
  });

  it("has password type by default", () => {
    render(<PasswordInputField {...baseProps} />);
    const input = screen.getByLabelText(baseProps.label);
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles to text type on visibility click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<PasswordInputField {...baseProps} onTogglePassword={onToggle} />);
    const toggleBtn = screen.getByRole("button");
    await user.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("toggles back to password type on second click", async () => {
    const user = userEvent.setup();
    render(<PasswordInputField {...baseProps} />);
    const toggleBtn = screen.getByRole("button");
    await user.click(toggleBtn);
    await user.click(toggleBtn);
    const input = screen.getByLabelText(baseProps.label);
    expect(input).toHaveAttribute("type", "password");
  });

  it("calls register.onChange when typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PasswordInputField
        {...baseProps}
        register={{ ...baseProps.register, onChange }}
      />
    );
    const input = screen.getByPlaceholderText("Enter password");
    await user.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls register.onBlur when blurring", async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup();
    render(
      <PasswordInputField
        {...baseProps}
        register={{ ...baseProps.register, onBlur }}
      />
    );
    const input = screen.getByPlaceholderText("Enter password");
    await user.click(input);
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it("spreads restRegister props to input", () => {
    render(
      <PasswordInputField
        {...baseProps}
        register={{
          ...baseProps.register,
          name: "my-password" as const,
        }}
      />
    );
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveAttribute("name", "my-password");
  });

  it("renders error with undefined message", () => {
    render(
      <PasswordInputField {...baseProps} error={{ message: undefined }} />
    );
    expect(screen.getByTestId("field-error")).toBeInTheDocument();
  });
});
