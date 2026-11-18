import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  domAnimation: {},
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
}));

vi.mock("@ctrl-ui/react/ui/field", () => ({
  Field: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  FieldError: ({
    children,
    match,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    match?: boolean;
    "data-testid"?: string;
  }) => (match ? <span data-testid={testId}>{children}</span> : null),
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("./lib/auth-validation", () => ({
  animationVariants: {
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
  },
}));

import {
  AuthConfirmPassword,
  AuthForgotPasswordLink,
} from "./auth-forgot-password";

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
});

describe("AuthConfirmPassword", () => {
  const baseProps = {
    isSubmitting: false,
    onConfirmPasswordChange: vi.fn(),
    register: vi.fn(() => ({ name: "confirmPassword" })) as ReturnType<
      typeof vi.fn
    >,
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
});
