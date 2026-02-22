import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the hook
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

// Track the email query state
let mockEmailExistsData: { exists: boolean } | undefined;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockEmailExistsData),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    auth_helpers: {
      checkEmailExists: "checkEmailExists",
    },
  },
}));

vi.mock("@reflet/env/web", () => ({
  env: {
    NEXT_PUBLIC_CONVEX_URL: "https://test.convex.cloud",
    NEXT_PUBLIC_CONVEX_SITE_URL: "https://test.convex.site",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-key",
    NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION: undefined,
  },
}));

// Mock TanStack Pacer with controllable debounce
let debouncedValue = "";
const mockUseDebouncedValue = vi.fn((_value: string) => [debouncedValue]);
vi.mock("@tanstack/react-pacer", () => ({
  useDebouncedValue: (value: string, _opts: unknown) =>
    mockUseDebouncedValue(value),
}));

import { authClient } from "@/lib/auth-client";
import { useAuthForm } from "./use-auth-form";

describe("useAuthForm - button disabled state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailExistsData = undefined;
    debouncedValue = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enables submit button after email is checked and user enters password for sign-in", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Initially: no mode, isCheckingEmail should be false
    expect(result.current.mode).toBeNull();
    expect(result.current.isCheckingEmail).toBe(false);

    // User types email
    act(() => {
      result.current.setValue("email", "test@example.com");
    });

    // Simulate debounce completing - this triggers email check
    debouncedValue = "test@example.com";
    rerender();

    // Now isCheckingEmail should be true while waiting for query
    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(true);
    });

    // Simulate the query returning that email exists (sign-in mode)
    mockEmailExistsData = { exists: true };
    rerender();

    // After query returns, isCheckingEmail should be false and mode should be signIn
    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(false);
      expect(result.current.mode).toBe("signIn");
    });

    // User enters password
    act(() => {
      result.current.setValue("password", "anypassword");
    });
    rerender();

    // The critical assertion: isCheckingEmail must be false for button to enable
    expect(result.current.isCheckingEmail).toBe(false);
  });

  it("isCheckingEmail stays false after blur when email check already completed", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Set up: complete email check flow
    debouncedValue = "test@example.com";
    act(() => {
      result.current.setValue("email", "test@example.com");
    });
    rerender();

    // Wait for isCheckingEmail to be true first
    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(true);
    });

    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
      expect(result.current.isCheckingEmail).toBe(false);
    });

    // Now email check is complete, simulate user blurring and re-focusing
    // which calls handleEmailChange with the SAME value
    act(() => {
      result.current.handleEmailChange({
        target: { value: "test@example.com" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    rerender();

    // Button should STILL be enabled - isCheckingEmail should remain false
    expect(result.current.isCheckingEmail).toBe(false);
  });

  it("does not re-trigger check when debounced email matches lastCheckedEmail", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Complete an email check
    debouncedValue = "user@test.com";
    act(() => {
      result.current.setValue("email", "user@test.com");
    });
    rerender();

    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(true);
    });

    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(false);
      expect(result.current.mode).toBe("signIn");
    });

    // The debounced value is still the same, re-render should NOT set isCheckingEmail true
    rerender();
    expect(result.current.isCheckingEmail).toBe(false);

    // Multiple re-renders should keep it false
    rerender();
    rerender();
    expect(result.current.isCheckingEmail).toBe(false);
  });

  it("clears isCheckingEmail when query returns even if email state has leading/trailing spaces", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // User types email with space (common on mobile)
    act(() => {
      result.current.setValue("email", "test@example.com ");
    });

    // Debounce trims the email
    debouncedValue = "test@example.com";
    rerender();

    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(true);
    });

    mockEmailExistsData = { exists: true };
    rerender();

    // Should still clear isCheckingEmail even though the form email has trailing space
    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(false);
      expect(result.current.mode).toBe("signIn");
    });
  });

  it("does not have stale isCheckingEmail when user rapidly types and query returns", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // User types first email
    act(() => {
      result.current.setValue("email", "first@example.com");
    });
    debouncedValue = "first@example.com";
    rerender();

    await waitFor(() => {
      expect(result.current.isCheckingEmail).toBe(true);
    });

    // User changes to different email BEFORE query returns
    act(() => {
      result.current.setValue("email", "second@example.com");
    });
    debouncedValue = "second@example.com";
    rerender();

    // Query returns for first email
    mockEmailExistsData = { exists: true };
    rerender();

    // The email state should be "second@example.com" (from debounce effect)
    // But lastCheckedEmail will be set to whatever the current email state is

    await waitFor(() => {
      // After query returns, isCheckingEmail should eventually be false
      // This might require multiple rerenders as state settles
      expect(result.current.isCheckingEmail).toBe(false);
    });
  });

  it("form validation allows sign-in with any password length", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Complete email check for sign-in mode
    act(() => {
      result.current.setValue("email", "test@example.com");
    });
    debouncedValue = "test@example.com";
    rerender();

    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
      expect(result.current.isCheckingEmail).toBe(false);
    });

    // Enter a short password (< 8 chars) - should be allowed for sign-in
    act(() => {
      result.current.setValue("password", "short");
    });
    rerender();

    // Trigger validation
    await act(async () => {
      await result.current.trigger("password");
    });
    rerender();

    // For sign-in mode, there should be NO password length error
    // (existing users may have shorter passwords)
    expect(result.current.errors.password).toBeUndefined();
    expect(result.current.isCheckingEmail).toBe(false);
  });

  it("validation uses correct schema after mode changes from null to signIn", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Initially mode is null
    expect(result.current.mode).toBeNull();

    // User types password BEFORE email check completes (mode is still null)
    act(() => {
      result.current.setValue("password", "abc");
    });
    rerender();

    // Trigger validation while mode is still null
    await act(async () => {
      await result.current.trigger("password");
    });
    rerender();

    // Mode is null, so signInSchema is used - password "abc" should pass (min 1 char)
    // This is actually correct behavior for sign-in
    expect(result.current.errors.password).toBeUndefined();

    // Now email check completes and mode becomes signIn
    debouncedValue = "test@example.com";
    act(() => {
      result.current.setValue("email", "test@example.com");
    });
    rerender();

    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
    });

    // Trigger password validation again after mode change
    await act(async () => {
      await result.current.trigger("password");
    });
    rerender();

    // Password should STILL be valid for sign-in (any length > 0)
    expect(result.current.errors.password).toBeUndefined();
  });

  it("validation uses signUp rules when mode is signUp", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Set up signUp mode (email doesn't exist)
    debouncedValue = "newuser@example.com";
    act(() => {
      result.current.setValue("email", "newuser@example.com");
    });
    rerender();

    mockEmailExistsData = { exists: false };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signUp");
    });

    // For signUp, enter a valid password (>= 8 chars)
    act(() => {
      result.current.setValue("password", "longpassword123");
    });
    rerender();

    await act(async () => {
      await result.current.trigger("password");
    });
    rerender();

    // Long password should not have errors
    expect(result.current.errors.password).toBeUndefined();
    expect(result.current.mode).toBe("signUp");
  });

  it("REGRESSION: button should be enabled when sign-in mode active with password", async () => {
    // This test reproduces the bug: button shows "Sign in" but stays disabled
    const { result, rerender } = renderHook(() => useAuthForm());

    // User types email and password simultaneously (before email check)
    act(() => {
      result.current.setValue("email", "existing@example.com");
      result.current.setValue("password", "mypassword123");
    });
    rerender();

    // Trigger validation while mode is still null
    await act(async () => {
      await result.current.trigger();
    });
    rerender();

    // Debounce fires for email
    debouncedValue = "existing@example.com";
    rerender();

    // Query returns - user exists, so sign-in mode
    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
      expect(result.current.isCheckingEmail).toBe(false);
    });

    // Re-trigger validation now that mode is signIn
    await act(async () => {
      await result.current.trigger();
    });
    rerender();

    // Button should be enabled: no errors, mode is signIn, password entered
    expect(result.current.isCheckingEmail).toBe(false);
    expect(Object.keys(result.current.errors).length).toBe(0);
  });

  it("BUG: email blur after check complete should not re-trigger isCheckingEmail", async () => {
    // Scenario: User completes email check, enters password, then blurs/refocuses email
    const { result, rerender } = renderHook(() => useAuthForm());

    // Complete the email check flow
    debouncedValue = "user@test.com";
    act(() => {
      result.current.setValue("email", "user@test.com");
    });
    rerender();

    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
      expect(result.current.isCheckingEmail).toBe(false);
    });

    // Enter password
    act(() => {
      result.current.setValue("password", "pass123");
    });
    rerender();

    // Button should be enabled at this point
    expect(result.current.isCheckingEmail).toBe(false);

    // User clicks into password field, then back to email (common UX pattern)
    // This triggers handleEmailChange with the same value
    act(() => {
      result.current.handleEmailChange({
        target: { value: "user@test.com" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    rerender();

    // After multiple renders, isCheckingEmail should still be false
    // because the email hasn't changed
    expect(result.current.isCheckingEmail).toBe(false);

    // Simulate more rerenders (debounce might fire again)
    rerender();
    rerender();

    // Still should be false
    expect(result.current.isCheckingEmail).toBe(false);
    expect(result.current.mode).toBe("signIn");
  });
});

describe("useAuthForm - onSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailExistsData = undefined;
    debouncedValue = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets apiError when mode is null on submit", async () => {
    const { result } = renderHook(() => useAuthForm());
    expect(result.current.mode).toBeNull();

    await act(async () => {
      await result.current.onSubmit({
        email: "test@example.com",
        password: "pw",
        confirmPassword: "",
      });
    });

    expect(result.current.apiError).toBe("Please verify your email");
  });

  it("calls authClient.signIn.email and navigates on signIn success", async () => {
    const mockedSignIn = vi.mocked(authClient.signIn.email);
    mockedSignIn.mockImplementation((_data, options) => {
      options?.onSuccess?.({} as never);
      return Promise.resolve({} as never);
    });

    const { result, rerender } = renderHook(() => useAuthForm());

    // Set up signIn mode
    debouncedValue = "user@example.com";
    act(() => {
      result.current.setValue("email", "user@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
    });

    await act(async () => {
      await result.current.onSubmit({
        email: "user@example.com",
        password: "pass123",
        confirmPassword: "",
      });
    });

    expect(mockedSignIn).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/pending-invitations");
  });

  it("sets apiError on signIn error", async () => {
    const mockedSignIn = vi.mocked(authClient.signIn.email);
    mockedSignIn.mockImplementation((_data, options) => {
      options?.onError?.({
        error: { message: "Invalid credentials", statusText: "" },
      } as never);
      return Promise.resolve({} as never);
    });

    const { result, rerender } = renderHook(() => useAuthForm());

    debouncedValue = "user@example.com";
    act(() => {
      result.current.setValue("email", "user@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
    });

    await act(async () => {
      await result.current.onSubmit({
        email: "user@example.com",
        password: "wrongpw",
        confirmPassword: "",
      });
    });

    expect(result.current.apiError).not.toBeNull();
  });

  it("redirects to check-email on email not verified error", async () => {
    const mockedSignIn = vi.mocked(authClient.signIn.email);
    mockedSignIn.mockImplementation((_data, options) => {
      options?.onError?.({
        error: { message: "Email not verified", statusText: "" },
      } as never);
      return Promise.resolve({} as never);
    });

    const { result, rerender } = renderHook(() => useAuthForm());

    debouncedValue = "user@example.com";
    act(() => {
      result.current.setValue("email", "user@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
    });

    await act(async () => {
      await result.current.onSubmit({
        email: "user@example.com",
        password: "pw",
        confirmPassword: "",
      });
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/auth/check-email?email=user%40example.com"
    );
  });

  it("calls authClient.signUp.email and navigates on signUp success", async () => {
    const mockedSignUp = vi.mocked(authClient.signUp.email);
    mockedSignUp.mockImplementation((_data, options) => {
      options?.onSuccess?.({} as never);
      return Promise.resolve({} as never);
    });

    const { result, rerender } = renderHook(() => useAuthForm());

    debouncedValue = "new@example.com";
    act(() => {
      result.current.setValue("email", "new@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: false };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signUp");
    });

    await act(async () => {
      await result.current.onSubmit({
        email: "new@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
    });

    expect(mockedSignUp).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      "/auth/check-email?email=new%40example.com"
    );
  });

  it("sets apiError on signUp error", async () => {
    const mockedSignUp = vi.mocked(authClient.signUp.email);
    mockedSignUp.mockImplementation((_data, options) => {
      options?.onError?.({
        error: { message: "User already exists", statusText: "" },
      } as never);
      return Promise.resolve({} as never);
    });

    const { result, rerender } = renderHook(() => useAuthForm());

    debouncedValue = "new@example.com";
    act(() => {
      result.current.setValue("email", "new@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: false };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signUp");
    });

    await act(async () => {
      await result.current.onSubmit({
        email: "new@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
    });

    expect(result.current.apiError).not.toBeNull();
  });
});

describe("useAuthForm - resetMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailExistsData = undefined;
    debouncedValue = "";
  });

  it("resets mode, emailChecked, and email back to initial state", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Set up signIn mode
    debouncedValue = "test@example.com";
    act(() => {
      result.current.setValue("email", "test@example.com");
    });
    rerender();
    mockEmailExistsData = { exists: true };
    rerender();

    await waitFor(() => {
      expect(result.current.mode).toBe("signIn");
    });

    act(() => {
      result.current.resetMode();
    });
    rerender();

    expect(result.current.mode).toBeNull();
    expect(result.current.emailChecked).toBe(false);
    expect(result.current.email).toBe("");
  });
});

describe("useAuthForm - handleEmailChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailExistsData = undefined;
    debouncedValue = "";
  });

  it("clears apiError when email changes", async () => {
    const { result, rerender } = renderHook(() => useAuthForm());

    // Set an api error first
    act(() => {
      result.current.setApiError("Some error");
    });
    rerender();
    expect(result.current.apiError).toBe("Some error");

    act(() => {
      result.current.handleEmailChange({
        target: { value: "new@example.com" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    rerender();

    expect(result.current.apiError).toBeNull();
  });
});
