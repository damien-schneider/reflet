import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => undefined),
}));

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: vi.fn(() => ({
    isLoading: false,
    isSubscribed: false,
    isSupported: true,
    permissionState: "default",
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    notifications: {
      preferences: {
        getPreferences: "notification_preferences.getPreferences",
        updatePreferences: "notification_preferences.updatePreferences",
      },
      push_queries: {
        getUserSubscriptions: "push_notifications_queries.getUserSubscriptions",
        unsubscribe: "push_notifications_queries.unsubscribe",
      },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@ctrl-ui/react/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    disabled: boolean;
    onCheckedChange: (v: boolean) => void;
    id?: string;
  }) => (
    <button
      aria-checked={checked}
      data-testid={id ? `switch-${id}` : "switch"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    />
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  BellSlash: () => <svg />,
  Warning: () => <svg />,
}));

import { useMutation, useQuery } from "convex/react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

import { NotificationSettings } from "./notification-settings";

describe("NotificationSettings", () => {
  it("shows warning when push is not supported", () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isLoading: false,
      isSubscribed: false,
      isSupported: false,
      permissionState: "default",
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationSettings />);
    expect(
      screen.getByText(/Push notifications are not supported/)
    ).toBeInTheDocument();
  });

  it("shows blocked warning when permission is denied", () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isLoading: false,
      isSubscribed: false,
      isSupported: true,
      permissionState: "denied",
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationSettings />);
    expect(
      screen.getByText(/Notifications are blocked by your browser/)
    ).toBeInTheDocument();
  });

  it("does not render Active Devices when no subscriptions", () => {
    render(<NotificationSettings />);
    expect(screen.queryByText("Active devices")).not.toBeInTheDocument();
  });

  it("renders Active Devices when subscriptions exist", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        notifyOnInvitation: true,
        notifyOnNewComment: true,
        notifyOnNewSupportMessage: true,
        notifyOnStatusChange: true,
        notifyOnVoteMilestone: true,
        pushEnabled: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub1",
          createdAt: Date.now() - 86_400_000,
          endpoint: "https://push.example.com",
          userAgent: "Chrome/120 Mobile",
        },
      ]);

    render(<NotificationSettings />);
    expect(screen.getByText("Active devices")).toBeInTheDocument();
  });

  it("calls subscribe when push toggle is clicked while disabled", async () => {
    const mockSubscribe = vi.fn().mockResolvedValue(true);
    vi.mocked(usePushNotifications).mockReturnValue({
      isLoading: false,
      isSubscribed: false,
      isSupported: true,
      permissionState: "default",
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    });
    vi.mocked(useQuery).mockReturnValue({
      notifyOnInvitation: true,
      notifyOnNewComment: true,
      notifyOnNewSupportMessage: true,
      notifyOnStatusChange: true,
      notifyOnVoteMilestone: true,
      pushEnabled: false,
    });
    const user = userEvent.setup();
    render(<NotificationSettings />);
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("calls unsubscribe when push toggle is clicked while enabled", async () => {
    const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
    vi.mocked(usePushNotifications).mockReturnValue({
      isLoading: false,
      isSubscribed: true,
      isSupported: true,
      permissionState: "granted",
      subscribe: vi.fn(),
      unsubscribe: mockUnsubscribe,
    });
    vi.mocked(useQuery).mockReturnValue({
      notifyOnInvitation: true,
      notifyOnNewComment: true,
      notifyOnNewSupportMessage: true,
      notifyOnStatusChange: true,
      notifyOnVoteMilestone: true,
      pushEnabled: true,
    });
    const user = userEvent.setup();
    render(<NotificationSettings />);
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it.each([
    {
      device: "Chrome on Desktop",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    {
      device: "Firefox on Desktop",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0",
    },
    {
      device: "Safari on Desktop",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    },
    {
      device: "Edge on Desktop",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    },
    {
      device: "on Mobile",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    },
    { device: "Unknown device", userAgent: undefined },
  ])("lists an active device as $device", ({ device, userAgent }) => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ pushEnabled: true })
      .mockReturnValueOnce([
        {
          _id: "sub1",
          createdAt: Date.now(),
          endpoint: "https://push.example.com",
          userAgent,
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText("Active devices")).toBeInTheDocument();
    expect(screen.getByText(device, { exact: false })).toBeInTheDocument();
  });

  it.each([
    {
      label: "Email me about new feedback",
      patch: { emailOnNewFeedback: false },
      pushEnabled: false,
    },
    {
      label: "Weekly digest",
      patch: { emailOnWeeklyDigest: false },
      pushEnabled: false,
    },
    {
      label: "Feedback shipped",
      patch: { emailOnFeedbackShipped: false },
      pushEnabled: false,
    },
    {
      label: "New feedback",
      patch: { notifyOnNewFeedback: false },
      pushEnabled: true,
    },
  ])(
    "turning off “$label” saves $patch",
    async ({ label, patch, pushEnabled }) => {
      const mockUpdatePrefs = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useMutation).mockReturnValue(mockUpdatePrefs);
      vi.mocked(useQuery).mockReturnValue({ pushEnabled });
      render(<NotificationSettings />);
      const switchId = screen
        .getByText(label)
        .closest("label")
        ?.getAttribute("for");
      await userEvent.setup().click(screen.getByTestId(`switch-${switchId}`));
      expect(mockUpdatePrefs).toHaveBeenCalledWith(patch);
    }
  );
});
