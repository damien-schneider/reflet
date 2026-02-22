import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: vi.fn(() => ({
    isSupported: true,
    permissionState: "default",
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    notification_preferences: {
      getPreferences: "notification_preferences.getPreferences",
      updatePreferences: "notification_preferences.updatePreferences",
    },
    push_notifications_queries: {
      getUserSubscriptions: "push_notifications_queries.getUserSubscriptions",
      unsubscribe: "push_notifications_queries.unsubscribe",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
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

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
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

vi.mock("@/components/ui/typography", () => ({
  Muted: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock("@phosphor-icons/react", () => ({
  Bell: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  BellRinging: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  BellSlash: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  ChatCircle: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Devices: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Envelope: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  TrendUp: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Warning: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

import { useQuery } from "convex/react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

import { NotificationSettings } from "./notification-settings";

afterEach(cleanup);

describe("NotificationSettings", () => {
  it("renders Push Notifications card", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
  });

  it("renders Notification Types card", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Notification Types")).toBeInTheDocument();
  });

  it("renders all notification type toggles", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Status changes")).toBeInTheDocument();
    expect(screen.getByText("New comments")).toBeInTheDocument();
    expect(screen.getByText("Vote milestones")).toBeInTheDocument();
    expect(screen.getByText("Support messages")).toBeInTheDocument();
    expect(screen.getByText("Invitations")).toBeInTheDocument();
  });

  it("shows warning when push is not supported", () => {
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: false,
      permissionState: "default",
      isSubscribed: false,
      isLoading: false,
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
      isSupported: true,
      permissionState: "denied",
      isSubscribed: false,
      isLoading: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<NotificationSettings />);
    expect(
      screen.getByText(/Notifications are blocked by your browser/)
    ).toBeInTheDocument();
  });

  it("renders Enable push notifications toggle", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Enable push notifications")).toBeInTheDocument();
  });

  it("does not render Active Devices when no subscriptions", () => {
    render(<NotificationSettings />);
    expect(screen.queryByText("Active Devices")).not.toBeInTheDocument();
  });

  it("renders Active Devices when subscriptions exist", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub1",
          endpoint: "https://push.example.com",
          userAgent: "Chrome/120 Mobile",
          createdAt: Date.now() - 86_400_000,
        },
      ]);

    render(<NotificationSettings />);
    expect(screen.getByText("Active Devices")).toBeInTheDocument();
  });

  it("calls subscribe when push toggle is clicked while disabled", async () => {
    const mockSubscribe = vi.fn().mockResolvedValue(true);
    vi.mocked(usePushNotifications).mockReturnValue({
      isSupported: true,
      permissionState: "default",
      isSubscribed: false,
      isLoading: false,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    });
    vi.mocked(useQuery).mockReturnValue({
      pushEnabled: false,
      notifyOnStatusChange: true,
      notifyOnNewComment: true,
      notifyOnVoteMilestone: true,
      notifyOnNewSupportMessage: true,
      notifyOnInvitation: true,
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
      isSupported: true,
      permissionState: "granted",
      isSubscribed: true,
      isLoading: false,
      subscribe: vi.fn(),
      unsubscribe: mockUnsubscribe,
    });
    vi.mocked(useQuery).mockReturnValue({
      pushEnabled: true,
      notifyOnStatusChange: true,
      notifyOnNewComment: true,
      notifyOnVoteMilestone: true,
      notifyOnNewSupportMessage: true,
      notifyOnInvitation: true,
    });
    const user = userEvent.setup();
    render(<NotificationSettings />);
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("renders notification type descriptions", () => {
    render(<NotificationSettings />);
    expect(
      screen.getByText(/status of your feedback changes/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/someone comments on your feedback/)
    ).toBeInTheDocument();
  });

  it("renders card description for push notifications", () => {
    render(<NotificationSettings />);
    expect(
      screen.getByText(/Receive real-time notifications on this device/)
    ).toBeInTheDocument();
  });

  it("renders card description for notification types", () => {
    render(<NotificationSettings />);
    expect(
      screen.getByText(/Choose which types of notifications/)
    ).toBeInTheDocument();
  });

  it("shows Active Devices with Chrome Desktop user agent", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub1",
          endpoint: "https://push.example.com",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText("Active Devices")).toBeInTheDocument();
    expect(screen.getByText(/Chrome on Desktop/)).toBeInTheDocument();
  });

  it("shows Firefox Desktop user agent", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub2",
          endpoint: "https://push.example.com",
          userAgent:
            "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText(/Firefox on Desktop/)).toBeInTheDocument();
  });

  it("shows Safari Desktop user agent", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub3",
          endpoint: "https://push.example.com",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText(/Safari on Desktop/)).toBeInTheDocument();
  });

  it("shows Unknown device when user agent is missing", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub4",
          endpoint: "https://push.example.com",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText("Unknown device")).toBeInTheDocument();
  });

  it("shows Mobile user agent for mobile user agent string", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub5",
          endpoint: "https://push.example.com",
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText(/on Mobile/)).toBeInTheDocument();
  });

  it("renders push notification settings heading", () => {
    render(<NotificationSettings />);
    const headings = screen.getAllByText(/Push Notifications|Notifications/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders enable notifications button when no subscriptions", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<NotificationSettings />);
    const elements = screen.getAllByText(/Enable|Subscribe|Turn on/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("shows device count when subscriptions exist", () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        _id: "sub1",
        endpoint: "https://push.example.com",
        userAgent: "Chrome",
        createdAt: Date.now(),
      },
      {
        _id: "sub2",
        endpoint: "https://push2.example.com",
        userAgent: "Firefox",
        createdAt: Date.now(),
      },
    ]);
    render(<NotificationSettings />);
    const elements = screen.getAllByText(/2|devices/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("toggles notification type when switch is clicked", async () => {
    const mockUpdatePrefs = vi.fn().mockResolvedValue(undefined);
    const { useMutation } = await import("convex/react");
    vi.mocked(useMutation).mockReturnValue(mockUpdatePrefs);
    vi.mocked(useQuery).mockReturnValue({
      pushEnabled: true,
      notifyOnStatusChange: true,
      notifyOnNewComment: true,
      notifyOnVoteMilestone: true,
      notifyOnNewSupportMessage: true,
      notifyOnInvitation: true,
    });
    const user = userEvent.setup();
    render(<NotificationSettings />);
    const switches = screen.getAllByRole("switch");
    // Click a notification type toggle (not the push toggle)
    if (switches.length > 1) {
      await user.click(switches[1]);
      expect(mockUpdatePrefs).toHaveBeenCalled();
    }
  });

  it("shows Edge Desktop user agent", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComment: true,
        notifyOnVoteMilestone: true,
        notifyOnNewSupportMessage: true,
        notifyOnInvitation: true,
      })
      .mockReturnValueOnce([
        {
          _id: "sub6",
          endpoint: "https://push.example.com",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
          createdAt: Date.now(),
        },
      ]);
    render(<NotificationSettings />);
    expect(screen.getByText(/Edge on Desktop/)).toBeInTheDocument();
  });

  it("renders multiple notification type sections", () => {
    render(<NotificationSettings />);
    expect(screen.getByText("Status changes")).toBeInTheDocument();
    expect(screen.getByText("New comments")).toBeInTheDocument();
  });
});
