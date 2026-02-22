import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    changelog_subscriptions: {
      isSubscribed: "changelog_subscriptions:isSubscribed",
      subscribe: "changelog_subscriptions:subscribe",
      unsubscribe: "changelog_subscriptions:unsubscribe",
      subscribeByEmail: "changelog_subscriptions:subscribeByEmail",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  Bell: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="bell-icon" />
  ),
  BellSlash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="bell-slash-icon" />
  ),
  Envelope: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="envelope-icon" />
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
  }) => (
    <button
      className={className}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="email-input" {...props} />
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null })),
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ChangelogSubscribe } from "./changelog-subscribe";

const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("ChangelogSubscribe", () => {
  const mockSubscribe = vi.fn().mockResolvedValue(undefined);
  const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
  const mockSubscribeByEmail = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockUseMutation.mockImplementation((mutationName: string) => {
      if (mutationName === "changelog_subscriptions:subscribe") {
        return mockSubscribe;
      }
      if (mutationName === "changelog_subscriptions:unsubscribe") {
        return mockUnsubscribe;
      }
      if (mutationName === "changelog_subscriptions:subscribeByEmail") {
        return mockSubscribeByEmail;
      }
      return vi.fn();
    });
  });

  describe("when user is not logged in", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
      } as ReturnType<typeof authClient.useSession>);
      mockUseQuery.mockReturnValue(false);
    });

    it("renders email subscription form", () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByText("Subscribe")).toBeInTheDocument();
    });

    it("shows envelope icon", () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByTestId("envelope-icon")).toBeInTheDocument();
    });

    it("updates email input value", () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      const input = screen.getByTestId("email-input");
      fireEvent.change(input, { target: { value: "user@test.com" } });
      expect(input).toHaveValue("user@test.com");
    });

    it("shows error when submitting empty email", async () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      const form = screen.getByTestId("email-input").closest("form")!;
      fireEvent.submit(form);
      expect(mockToast.error).toHaveBeenCalledWith("Email is required");
    });

    it("calls subscribeByEmail with valid email", async () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      const input = screen.getByTestId("email-input");
      fireEvent.change(input, { target: { value: "user@test.com" } });
      const form = input.closest("form")!;
      fireEvent.submit(form);
      expect(mockSubscribeByEmail).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        email: "user@test.com",
      });
    });

    it("renders email placeholder", () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByTestId("email-input")).toHaveAttribute(
        "placeholder",
        "your@email.com"
      );
    });
  });

  describe("when user is logged in", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: "user123" } },
      } as ReturnType<typeof authClient.useSession>);
    });

    it("renders subscribe button when not subscribed", () => {
      mockUseQuery.mockReturnValue(false);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByText("Subscribe")).toBeInTheDocument();
      expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
    });

    it("renders unsubscribe button when subscribed", () => {
      mockUseQuery.mockReturnValue(true);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByText("Unsubscribe")).toBeInTheDocument();
      expect(screen.getByTestId("bell-slash-icon")).toBeInTheDocument();
    });

    it("disables button when subscription state is loading", () => {
      mockUseQuery.mockReturnValue(undefined);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("calls subscribe when clicking Subscribe", async () => {
      mockUseQuery.mockReturnValue(false);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      fireEvent.click(screen.getByText("Subscribe"));
      expect(mockSubscribe).toHaveBeenCalledWith({
        organizationId: ORG_ID,
      });
    });

    it("calls unsubscribe when clicking Unsubscribe", async () => {
      mockUseQuery.mockReturnValue(true);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      fireEvent.click(screen.getByText("Unsubscribe"));
      expect(mockUnsubscribe).toHaveBeenCalledWith({
        organizationId: ORG_ID,
      });
    });

    it("has outline variant when subscribed", () => {
      mockUseQuery.mockReturnValue(true);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-variant",
        "outline"
      );
    });

    it("has default variant when not subscribed", () => {
      mockUseQuery.mockReturnValue(false);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-variant",
        "default"
      );
    });

    it("does not show email form when logged in", () => {
      mockUseQuery.mockReturnValue(false);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.queryByTestId("email-input")).not.toBeInTheDocument();
    });
  });

  it("accepts custom className", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: "user123" } },
    } as ReturnType<typeof authClient.useSession>);
    mockUseQuery.mockReturnValue(false);
    render(<ChangelogSubscribe className="custom" organizationId={ORG_ID} />);
    expect(screen.getByRole("button")).toHaveClass("custom");
  });
});
