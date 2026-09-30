import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => async (values: Record<string, unknown>) => ({
    errors: {},
    values,
  }),
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changeEmail: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "button" | "submit";
  }) => (
    <button disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

import { toast } from "@ctrl-ui/react/ui/toast";
import { authClient } from "@/lib/auth-client";
import { EmailSection } from "./email-section";

const renderSection = (email: string | null | undefined, isLoading = false) =>
  render(
    <EmailSection
      isLoading={isLoading}
      setIsLoading={vi.fn()}
      user={email === undefined ? undefined : { email }}
    />
  );

describe("EmailSection", () => {
  it("names the address the member signs in with", () => {
    renderSection("current@test.com");
    expect(screen.getByText("current@test.com")).toBeInTheDocument();
  });

  it("says when no email is linked", () => {
    renderSection(null);
    expect(
      screen.getByText("No email address is linked to this account.")
    ).toBeInTheDocument();
  });

  it("labels the new email input", () => {
    renderSection("test@test.com");
    expect(screen.getByLabelText("New email")).toHaveAttribute(
      "autocomplete",
      "email"
    );
  });

  it("shows progress while the change is in flight", () => {
    renderSection("test@test.com", true);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("requests the change and tells the member where to confirm it", async () => {
    const user = userEvent.setup();
    renderSection("test@test.com");
    await user.type(screen.getByLabelText("New email"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Change email" }));
    expect(authClient.changeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ newEmail: "new@example.com" })
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Check new@example.com for a link to confirm the change."
    );
    expect(screen.getByLabelText("New email")).toHaveValue("");
  });

  it("shows the server error on failure", async () => {
    vi.mocked(authClient.changeEmail).mockRejectedValueOnce(
      new Error("Email taken")
    );
    const user = userEvent.setup();
    renderSection("test@test.com");
    await user.type(screen.getByLabelText("New email"), "taken@example.com");
    await user.click(screen.getByRole("button", { name: "Change email" }));
    expect(toast.error).toHaveBeenCalledWith("Email taken");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
