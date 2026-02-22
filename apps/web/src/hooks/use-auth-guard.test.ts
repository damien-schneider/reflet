import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthGuard } from "./use-auth-guard";

const mockOpenAuthDialog = vi.fn();

vi.mock("jotai", () => ({
  useSetAtom: () => mockOpenAuthDialog,
  atom: (val: unknown) => val,
}));

const mockUseSession = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

vi.mock("@/store/auth", () => ({
  openAuthDialogAtom: "mock-atom",
}));

describe("useAuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns isAuthenticated true when session has user id", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-123" } },
    });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("returns isAuthenticated false when session is null", () => {
    mockUseSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns isAuthenticated false when user has no id", () => {
    mockUseSession.mockReturnValue({ data: { user: {} } });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns userId from session", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-456" } },
    });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.userId).toBe("user-456");
  });

  it("returns undefined userId when not authenticated", () => {
    mockUseSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.userId).toBeUndefined();
  });

  it("guard executes action when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-123" } },
    });
    const action = vi.fn().mockReturnValue("result");
    const { result } = renderHook(() => useAuthGuard());

    let returnValue: unknown;
    act(() => {
      returnValue = result.current.guard(action);
    });

    expect(action).toHaveBeenCalledOnce();
    expect(returnValue).toBe("result");
    expect(mockOpenAuthDialog).not.toHaveBeenCalled();
  });

  it("guard opens auth dialog when not authenticated", () => {
    mockUseSession.mockReturnValue({ data: null });
    const action = vi.fn();
    const { result } = renderHook(() => useAuthGuard());

    let returnValue: unknown;
    act(() => {
      returnValue = result.current.guard(action);
    });

    expect(action).not.toHaveBeenCalled();
    expect(returnValue).toBeUndefined();
    expect(mockOpenAuthDialog).toHaveBeenCalledWith({
      message: "Connectez-vous pour effectuer cette action",
    });
  });

  it("guard uses custom message when provided", () => {
    mockUseSession.mockReturnValue({ data: null });
    const action = vi.fn();
    const { result } = renderHook(() =>
      useAuthGuard({ message: "Veuillez vous connecter pour voter" })
    );

    act(() => {
      result.current.guard(action);
    });

    expect(mockOpenAuthDialog).toHaveBeenCalledWith({
      message: "Veuillez vous connecter pour voter",
    });
  });

  it("guard handles async actions when authenticated", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-123" } },
    });
    const asyncAction = vi.fn().mockResolvedValue("async-result");
    const { result } = renderHook(() => useAuthGuard());

    let returnValue: unknown;
    act(() => {
      returnValue = result.current.guard(asyncAction);
    });

    expect(asyncAction).toHaveBeenCalledOnce();
    await expect(returnValue).resolves.toBe("async-result");
  });
});
