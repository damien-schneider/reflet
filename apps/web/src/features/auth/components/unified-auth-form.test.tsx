import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedAuthForm from "./unified-auth/unified-auth-form";

// Mock dependencies
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
  },
}));

vi.mock("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    className,
    "data-testid": dataTestId,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: "submit" | "reset" | "button";
    className?: string;
    "data-testid"?: string;
  }) => (
    <button
      className={className}
      data-testid={dataTestId}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, type, disabled, ...props }: any) => (
    <input disabled={disabled} id={id} type={type} {...props} />
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  FieldLabel: ({ children, className, htmlFor }: any) => (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
  ),
  FieldError: ({ errors, className }: any) =>
    errors && errors.length > 0 ? (
      <div className={className}>{errors[0].message}</div>
    ) : null,
}));

vi.mock("@reflet/env/web", () => ({
  env: {
    NEXT_PUBLIC_CONVEX_URL: "https://test.convex.cloud",
    NEXT_PUBLIC_CONVEX_SITE_URL: "https://test.convex.site",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-key",
    NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION: undefined,
  },
}));

vi.mock("@tanstack/react-pacer", () => ({
  useDebouncedValue: (value: string) => [value],
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations_personal: {
      ensurePersonalOrganization: vi.fn(),
    },
    auth_helpers: {
      checkEmailExists: vi.fn(),
    },
  },
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("UnifiedAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render without throwing ZodError on initial load", () => {
    expect(() => {
      render(<UnifiedAuthForm />);
    }).not.toThrow();
  });

  it("should render with email and password fields on initial load", () => {
    render(<UnifiedAuthForm />);

    const emailInput = screen.getAllByTestId("email-input")[0];
    const passwordInput = screen.getAllByTestId("password-input")[0];

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue("");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveValue("");
  });

  it("should not show validation errors on initial load", () => {
    render(<UnifiedAuthForm />);

    expect(screen.queryByText("Invalid email address")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Password must be at least 8 characters")
    ).not.toBeInTheDocument();
  });

  // Note: Password confirmation validation is tested in e2e tests (e2e/auth.e2e.ts)
  // because it requires the full application context with debounced email checking
  // and mode switching which is difficult to mock in unit tests.
});
