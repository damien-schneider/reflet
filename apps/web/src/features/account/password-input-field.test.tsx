import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FieldDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  FieldError: ({
    children,
    match,
  }: {
    children?: React.ReactNode;
    match?: boolean;
  }) => (match ? <span data-testid="field-error">{children}</span> : null),
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: ({
    ref: _ref,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: unknown }) => (
    <input {...props} />
  ),
}));

import { PasswordInputField } from "./password-input-field";

const baseProps = {
  autoComplete: "current-password" as const,
  id: "test-password",
  label: "Password",
  onTogglePassword: vi.fn(),
  placeholder: "Enter password",
  register: {
    name: "test-password" as const,
    onBlur: vi.fn(),
    onChange: vi.fn(),
    ref: vi.fn(),
  },
  showPassword: false,
};

describe("PasswordInputField", () => {
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

  it("labels the visibility toggle with what it will do", () => {
    const { rerender } = render(
      <PasswordInputField {...baseProps} showPassword={false} />
    );
    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeInTheDocument();
    rerender(<PasswordInputField {...baseProps} showPassword={true} />);
    expect(
      screen.getByRole("button", { name: "Hide password" })
    ).toBeInTheDocument();
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

  it("renders no error slot when the message is undefined", () => {
    render(
      <PasswordInputField {...baseProps} error={{ message: undefined }} />
    );
    expect(screen.queryByTestId("field-error")).not.toBeInTheDocument();
  });
});
