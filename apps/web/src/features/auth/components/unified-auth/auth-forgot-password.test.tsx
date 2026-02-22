import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  FieldError: ({
    errors,
    "data-testid": testId,
  }: {
    errors?: Array<{ message?: string }>;
    "data-testid"?: string;
  }) =>
    errors && errors.length > 0 ? (
      <span data-testid={testId}>{errors[0]?.message}</span>
    ) : null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("./lib/auth-validation", () => ({
  animationVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}));

import {
  AuthConfirmPassword,
  AuthForgotPasswordLink,
} from "./auth-forgot-password";

afterEach(cleanup);

describe("AuthForgotPasswordLink", () => {
  it("renders forgot password link in signIn mode", () => {
    render(<AuthForgotPasswordLink mode="signIn" />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?").closest("a")).toHaveAttribute(
      "href",
      "/auth/forgot-password"
    );
  });

  it("does not render in signUp mode", () => {
    render(<AuthForgotPasswordLink mode="signUp" />);
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });

  it("does not render when mode is null", () => {
    render(<AuthForgotPasswordLink mode={null} />);
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });
});

describe("AuthConfirmPassword", () => {
  const baseProps = {
    register: vi.fn(() => ({ name: "confirmPassword" })) as ReturnType<
      typeof vi.fn
    >,
    isSubmitting: false,
    onConfirmPasswordChange: vi.fn(),
    setValue: vi.fn(),
    trigger: vi.fn(),
  };

  it("renders confirm password field in signUp mode", () => {
    render(<AuthConfirmPassword {...baseProps} mode="signUp" />);
    expect(screen.getByText("Confirm password")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
  });

  it("does not render in signIn mode", () => {
    render(<AuthConfirmPassword {...baseProps} mode="signIn" />);
    expect(screen.queryByText("Confirm password")).not.toBeInTheDocument();
  });

  it("does not render when mode is null", () => {
    render(<AuthConfirmPassword {...baseProps} mode={null} />);
    expect(screen.queryByText("Confirm password")).not.toBeInTheDocument();
  });

  it("disables input when isSubmitting", () => {
    render(
      <AuthConfirmPassword {...baseProps} isSubmitting={true} mode="signUp" />
    );
    expect(screen.getByTestId("confirm-password-input")).toBeDisabled();
  });

  it("shows error when confirmPasswordErrors provided", () => {
    render(
      <AuthConfirmPassword
        {...baseProps}
        confirmPasswordErrors={[{ message: "Passwords do not match" }]}
        mode="signUp"
      />
    );
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("does not show error when no errors", () => {
    render(<AuthConfirmPassword {...baseProps} mode="signUp" />);
    expect(
      screen.queryByTestId("confirm-password-error")
    ).not.toBeInTheDocument();
  });

  it("has password type input for security", () => {
    render(<AuthConfirmPassword {...baseProps} mode="signUp" />);
    const input = screen.getByTestId("confirm-password-input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("enables input when not submitting", () => {
    render(
      <AuthConfirmPassword {...baseProps} isSubmitting={false} mode="signUp" />
    );
    expect(screen.getByTestId("confirm-password-input")).not.toBeDisabled();
  });

  it("calls onConfirmPasswordChange with event, setValue, and trigger on input change", () => {
    const onConfirmPasswordChange = vi.fn();
    const setValue = vi.fn();
    const trigger = vi.fn();
    render(
      <AuthConfirmPassword
        {...baseProps}
        mode="signUp"
        onConfirmPasswordChange={onConfirmPasswordChange}
        setValue={setValue}
        trigger={trigger}
      />
    );
    const input = screen.getByTestId("confirm-password-input");
    fireEvent.change(input, { target: { value: "newpass" } });
    expect(onConfirmPasswordChange).toHaveBeenCalledOnce();
    expect(onConfirmPasswordChange.mock.calls[0][1]).toBe(setValue);
    expect(onConfirmPasswordChange.mock.calls[0][2]).toBe(trigger);
  });

  it("shows empty errors array without rendering error element", () => {
    render(
      <AuthConfirmPassword
        {...baseProps}
        confirmPasswordErrors={[]}
        mode="signUp"
      />
    );
    expect(
      screen.queryByTestId("confirm-password-error")
    ).not.toBeInTheDocument();
  });

  it("renders link with correct styling class", () => {
    render(<AuthForgotPasswordLink mode="signIn" />);
    const link = screen.getByText("Forgot password?").closest("a");
    expect(link?.className).toContain("text-sm");
  });
});
