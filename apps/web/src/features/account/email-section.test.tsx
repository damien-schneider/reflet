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
    changeEmail: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: string;
    [key: string]: unknown;
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@phosphor-icons/react", () => ({
  Check: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Envelope: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

import { EmailSection } from "./email-section";

afterEach(cleanup);

describe("EmailSection", () => {
  it("renders card title", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders current email", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "current@test.com" }}
      />
    );
    expect(screen.getByText("current@test.com")).toBeInTheDocument();
  });

  it("shows N/A when email is missing", () => {
    render(
      <EmailSection isLoading={false} setIsLoading={vi.fn()} user={undefined} />
    );
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders new email input", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByPlaceholderText("new@example.com")).toBeInTheDocument();
  });

  it("renders Update Email button", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("Update Email")).toBeInTheDocument();
  });

  it("disables button when isLoading is true", () => {
    render(
      <EmailSection
        isLoading={true}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("Update Email")).toBeDisabled();
  });

  it("renders card description", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("Change your email address")).toBeInTheDocument();
  });

  it("renders Current Email label", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("Current Email")).toBeInTheDocument();
  });

  it("renders New Email label", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    expect(screen.getByText("New Email")).toBeInTheDocument();
  });

  it("allows typing in email input", async () => {
    const user = userEvent.setup();
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    const input = screen.getByPlaceholderText("new@example.com");
    await user.type(input, "new@example.com");
    expect(input).toHaveValue("new@example.com");
  });

  it("submits form and calls authClient.changeEmail", async () => {
    const { authClient } = await import("@/lib/auth-client");
    await import("sonner");
    const setIsLoading = vi.fn();
    const user = userEvent.setup();
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={setIsLoading}
        user={{ email: "test@test.com" }}
      />
    );
    const input = screen.getByPlaceholderText("new@example.com");
    await user.type(input, "new@example.com");
    await user.click(screen.getByText("Update Email"));
    expect(authClient.changeEmail).toHaveBeenCalled();
  });

  it("shows error toast on failure", async () => {
    const { authClient } = await import("@/lib/auth-client");
    const { toast } = await import("sonner");
    vi.mocked(authClient.changeEmail).mockRejectedValueOnce(
      new Error("Email taken")
    );
    const user = userEvent.setup();
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: "test@test.com" }}
      />
    );
    const input = screen.getByPlaceholderText("new@example.com");
    await user.type(input, "taken@example.com");
    await user.click(screen.getByText("Update Email"));
    expect(toast.error).toHaveBeenCalledWith("Email taken");
  });

  it("shows null email as N/A when user email is null", () => {
    render(
      <EmailSection
        isLoading={false}
        setIsLoading={vi.fn()}
        user={{ email: null }}
      />
    );
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
