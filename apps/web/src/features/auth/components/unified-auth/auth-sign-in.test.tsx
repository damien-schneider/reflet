/**
 * @vitest-environment jsdom
 */
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button disabled={disabled} type="submit" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
  FieldError: ({
    errors,
    className,
  }: {
    errors?: Array<{ message?: string }>;
    className?: string;
  }) =>
    errors && errors.length > 0 ? (
      <span className={className}>{errors[0]?.message}</span>
    ) : null,
}));

vi.mock("./lib/auth-validation", () => ({
  animationVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}));

import { AuthHelperText, AuthSubmitButton } from "./auth-sign-in";

afterEach(cleanup);

describe("AuthSubmitButton", () => {
  const baseProps = {
    mode: null as "signIn" | "signUp" | null,
    isSubmitting: false,
    isCheckingEmail: false,
    isFormValid: true,
    apiError: null as string | null,
  };

  it("renders Continue when mode is null", () => {
    render(<AuthSubmitButton {...baseProps} />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("renders Sign in when mode is signIn", () => {
    render(<AuthSubmitButton {...baseProps} mode="signIn" />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("renders Create my account when mode is signUp", () => {
    render(<AuthSubmitButton {...baseProps} mode="signUp" />);
    expect(screen.getByText("Create my account")).toBeInTheDocument();
  });

  it("renders Loading... when isSubmitting", () => {
    render(<AuthSubmitButton {...baseProps} isSubmitting />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("disables button when isSubmitting", () => {
    render(<AuthSubmitButton {...baseProps} isSubmitting />);
    expect(screen.getByTestId("submit-button")).toBeDisabled();
  });

  it("disables button when isCheckingEmail", () => {
    render(<AuthSubmitButton {...baseProps} isCheckingEmail />);
    expect(screen.getByTestId("submit-button")).toBeDisabled();
  });

  it("disables button when form is not valid", () => {
    render(<AuthSubmitButton {...baseProps} isFormValid={false} />);
    expect(screen.getByTestId("submit-button")).toBeDisabled();
  });

  it("enables button when valid and not submitting", () => {
    render(<AuthSubmitButton {...baseProps} />);
    expect(screen.getByTestId("submit-button")).not.toBeDisabled();
  });

  it("displays apiError message when present", () => {
    render(<AuthSubmitButton {...baseProps} apiError="Invalid credentials" />);
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("does not show error when apiError is null", () => {
    render(<AuthSubmitButton {...baseProps} />);
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });
});

describe("AuthHelperText", () => {
  it("renders sign-in helper text with reset link", () => {
    render(<AuthHelperText mode="signIn" onResetMode={vi.fn()} />);
    expect(screen.getByText(/Don't have an account\?/)).toBeInTheDocument();
    expect(screen.getByText("Use a different email")).toBeInTheDocument();
  });

  it("renders sign-up helper text with reset link", () => {
    render(<AuthHelperText mode="signUp" onResetMode={vi.fn()} />);
    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
    expect(screen.getByText("Use a different email")).toBeInTheDocument();
  });

  it("renders nothing when mode is null", () => {
    const { container } = render(
      <AuthHelperText mode={null} onResetMode={vi.fn()} />
    );
    expect(container.textContent).toBe("");
  });

  it("calls onResetMode when link is clicked", () => {
    const onResetMode = vi.fn();
    render(<AuthHelperText mode="signIn" onResetMode={onResetMode} />);
    fireEvent.click(screen.getByText("Use a different email"));
    expect(onResetMode).toHaveBeenCalledOnce();
  });
});
