import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    changelog: {
      subscriptions: {
        isSubscribed: "changelog.subscriptions:isSubscribed",
        subscribe: "changelog.subscriptions:subscribe",
        subscribeByEmail: "changelog.subscriptions:subscribeByEmail",
        unsubscribe: "changelog.subscriptions:unsubscribe",
      },
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
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="email-input" {...props} />
  ),
}));

vi.mock("@/components/ui/email-subscribe-form", () => ({
  EmailSubscribeForm: ({
    onSubscribe,
  }: {
    onSubscribe: (email: string) => Promise<void>;
  }) => {
    const [email, setEmail] = React.useState("");
    return (
      <form
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          await onSubscribe(email.trim());
        }}
      >
        <input
          data-testid="email-input"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          type="email"
          value={email}
        />
        <button type="submit">Subscribe</button>
      </form>
    );
  },
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null })),
  },
}));

import { authClient } from "@/lib/auth-client";
import { ChangelogSubscribe } from "./changelog-subscribe";

afterEach(() => {
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("ChangelogSubscribe", () => {
  const mockSubscribe = vi.fn().mockResolvedValue(undefined);
  const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
  const mockSubscribeByEmail = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockUseMutation.mockImplementation((mutationName: string) => {
      if (mutationName === "changelog.subscriptions:subscribe") {
        return mockSubscribe;
      }
      if (mutationName === "changelog.subscriptions:unsubscribe") {
        return mockUnsubscribe;
      }
      if (mutationName === "changelog.subscriptions:subscribeByEmail") {
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

    it("calls subscribeByEmail with valid email", async () => {
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      const input = screen.getByTestId("email-input");
      fireEvent.change(input, { target: { value: "user@test.com" } });
      const form = input.closest("form")!;
      fireEvent.submit(form);
      expect(mockSubscribeByEmail).toHaveBeenCalledWith({
        email: "user@test.com",
        organizationId: ORG_ID,
      });
    });
  });

  describe("when user is logged in", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: "user123" } },
      } as ReturnType<typeof authClient.useSession>);
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

    it("does not show email form when logged in", () => {
      mockUseQuery.mockReturnValue(false);
      render(<ChangelogSubscribe organizationId={ORG_ID} />);
      expect(screen.queryByTestId("email-input")).not.toBeInTheDocument();
    });
  });
});
