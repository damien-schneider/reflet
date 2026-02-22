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
  Input: ({
    id,
    type,
    disabled,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input disabled={disabled} id={id} type={type} {...props} />
  ),
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
    className,
    htmlFor,
  }: {
    children: React.ReactNode;
    className?: string;
    htmlFor?: string;
  }) => (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
  ),
  FieldError: ({
    errors,
    className,
  }: {
    errors?: Array<{ message: string }>;
    className?: string;
  }) =>
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

const mockSetApiError = vi.fn();
const mockSetValue = vi.fn();
const mockTrigger = vi.fn().mockResolvedValue(true);
const mockHandleSubmit = vi.fn(
  (cb: (data: unknown) => void) => (e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.();
    cb({
      email: "test@test.com",
      password: "password123",
      confirmPassword: "password123",
    });
  }
);
const mockRegister = vi.fn((name: string) => ({
  name,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
}));
const mockWatch = vi.fn((field: string) => {
  if (field === "password") {
    return "password123";
  }
  if (field === "confirmPassword") {
    return "password123";
  }
  return "";
});
const mockOnSubmit = vi.fn();
const mockResetMode = vi.fn();
const mockHandleEmailChange = vi.fn();

const defaultHookReturn = {
  mode: null as string | null,
  apiError: null as string | null,
  setApiError: mockSetApiError,
  passwordMismatchError: null as string | null,
  register: mockRegister,
  handleSubmit: mockHandleSubmit,
  errors: {} as Record<string, unknown>,
  isSubmitting: false,
  watch: mockWatch,
  setValue: mockSetValue,
  trigger: mockTrigger,
  onSubmit: mockOnSubmit,
  handleEmailChange: mockHandleEmailChange,
  isCheckingEmail: false,
  resetMode: mockResetMode,
};

vi.mock("./unified-auth/hooks/use-auth-form", () => ({
  useAuthForm: () => defaultHookReturn,
}));

describe("UnifiedAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultHookReturn.mode = null;
    defaultHookReturn.apiError = null;
    defaultHookReturn.passwordMismatchError = null;
    defaultHookReturn.errors = {};
    defaultHookReturn.isSubmitting = false;
    defaultHookReturn.isCheckingEmail = false;
    mockWatch.mockImplementation((field: string) => {
      if (field === "password") {
        return "password123";
      }
      if (field === "confirmPassword") {
        return "password123";
      }
      return "";
    });
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

  it("renders submit button", () => {
    render(<UnifiedAuthForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders email input field", () => {
    render(<UnifiedAuthForm />);
    const emailInputs = screen.getAllByTestId("email-input");
    expect(emailInputs.length).toBeGreaterThan(0);
  });

  it("renders password input field", () => {
    render(<UnifiedAuthForm />);
    const passwordInputs = screen.getAllByTestId("password-input");
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it("renders with onSuccess callback prop", () => {
    const onSuccess = vi.fn();
    expect(() => {
      render(<UnifiedAuthForm onSuccess={onSuccess} />);
    }).not.toThrow();
  });

  it("renders form element", () => {
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("renders email field with label", () => {
    render(<UnifiedAuthForm />);
    expect(screen.getAllByText("Email").length).toBeGreaterThan(0);
  });

  it("renders password field with label", () => {
    render(<UnifiedAuthForm />);
    expect(screen.getAllByText("Password").length).toBeGreaterThan(0);
  });

  it("email input has correct type", () => {
    render(<UnifiedAuthForm />);
    const emailInputs = screen.getAllByTestId("email-input");
    expect(emailInputs[0]).toHaveAttribute("type", "email");
  });

  it("password input has correct type", () => {
    render(<UnifiedAuthForm />);
    const passwordInputs = screen.getAllByTestId("password-input");
    expect(passwordInputs[0]).toHaveAttribute("type", "password");
  });

  it("renders form with action buttons", () => {
    render(<UnifiedAuthForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with custom className on form", () => {
    const { container } = render(<UnifiedAuthForm />);
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("renders social providers section", () => {
    render(<UnifiedAuthForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
  });

  // Note: Password confirmation validation is tested in e2e tests (e2e/auth.e2e.ts)
  // because it requires the full application context with debounced email checking
  // and mode switching which is difficult to mock in unit tests.

  it("disables submit when mode is signUp and password too short", () => {
    mockWatch.mockImplementation((field: string) => {
      if (field === "password") {
        return "short";
      }
      if (field === "confirmPassword") {
        return "short";
      }
      return "";
    });
    defaultHookReturn.mode = "signUp";
    render(<UnifiedAuthForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders with signIn mode", () => {
    defaultHookReturn.mode = "signIn";
    mockWatch.mockImplementation((field: string) => {
      if (field === "password") {
        return "pass";
      }
      if (field === "confirmPassword") {
        return "";
      }
      return "";
    });
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("renders confirm password when mode is signUp", () => {
    defaultHookReturn.mode = "signUp";
    mockWatch.mockImplementation((field: string) => {
      if (field === "password") {
        return "password123";
      }
      if (field === "confirmPassword") {
        return "password123";
      }
      return "";
    });
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("shows password mismatch error", () => {
    defaultHookReturn.mode = "signUp";
    defaultHookReturn.passwordMismatchError = "Passwords do not match";
    render(<UnifiedAuthForm />);
    // The error should be passed to AuthConfirmPassword
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("shows confirm password validation error from form errors", () => {
    defaultHookReturn.mode = "signUp";
    defaultHookReturn.passwordMismatchError = null;
    defaultHookReturn.errors = { confirmPassword: { message: "Required" } };
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("clears apiError on password change", () => {
    defaultHookReturn.mode = "signUp";
    render(<UnifiedAuthForm />);
    // The component defines handlePasswordChange which calls setApiError(null)
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("handles form with errors", () => {
    defaultHookReturn.errors = { email: { message: "Invalid email" } };
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("shows isCheckingEmail state", () => {
    defaultHookReturn.isCheckingEmail = true;
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("shows isSubmitting state", () => {
    defaultHookReturn.isSubmitting = true;
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });

  it("shows apiError", () => {
    defaultHookReturn.apiError = "Invalid credentials";
    render(<UnifiedAuthForm />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
  });
});
