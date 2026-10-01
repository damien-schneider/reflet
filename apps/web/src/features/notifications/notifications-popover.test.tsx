import { Button } from "@ctrl-ui/react/ui/button";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPopover } from "@/features/notifications/notifications-popover";

const notificationState = vi.hoisted(() => ({
  dismissPrompt: vi.fn<() => Promise<void>>(),
  hasInvitation: false,
  isLoading: false,
  isNotificationsLoading: false,
  isSubscribed: false,
  isSupported: true,
  permissionState: "default",
  preferencesLoaded: true,
  pushEnabled: false,
  pushPromptDismissed: false,
  subscribe: vi.fn<() => Promise<boolean>>(),
  updatePreferences:
    vi.fn<(preferences: { pushEnabled: boolean }) => Promise<void>>(),
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: Parameters<typeof getFunctionName>[0]) =>
    getFunctionName(mutation) === "notifications/preferences:dismissPushPrompt"
      ? notificationState.dismissPrompt
      : notificationState.updatePreferences,
  useQuery: (query: Parameters<typeof getFunctionName>[0]) => {
    switch (getFunctionName(query)) {
      case "notifications/queries:list":
        if (notificationState.isNotificationsLoading) {
          return;
        }
        return notificationState.hasInvitation
          ? [
              {
                _id: "invitation1",
                createdAt: Date.now(),
                invitationToken: "join-acme",
                isRead: false,
                message: "Join Acme as a member",
                title: "Acme invitation",
                type: "invitation",
              },
            ]
          : [];
      case "notifications/queries:getUnreadCount":
        return notificationState.isNotificationsLoading ? undefined : 0;
      case "notifications/preferences:getPreferences":
        return notificationState.preferencesLoaded
          ? notificationState
          : undefined;
      default:
        throw new Error(`Unexpected query: ${getFunctionName(query)}`);
    }
  },
}));
vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => notificationState,
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(notificationState, {
    hasInvitation: false,
    isLoading: false,
    isNotificationsLoading: false,
    isSubscribed: false,
    isSupported: true,
    permissionState: "default",
    preferencesLoaded: true,
    pushEnabled: false,
    pushPromptDismissed: false,
  });
  notificationState.subscribe.mockResolvedValue(true);
  notificationState.updatePreferences.mockResolvedValue();
  notificationState.dismissPrompt.mockResolvedValue();
});

async function openNotifications() {
  const user = userEvent.setup();
  render(
    <NotificationsPopover
      onSettingsNavigate={vi.fn()}
      render={<Button>Notifications</Button>}
    />
  );
  await user.click(screen.getByRole("button", { name: "Notifications" }));
  const popover = await screen.findByRole("dialog", { name: "Notifications" });
  return { popover, user };
}

describe("Notifications popover", () => {
  it("offers browser notifications beside the inbox and links directly to its settings", async () => {
    const { popover } = await openNotifications();
    expect(within(popover).getByText("No notifications yet")).toBeVisible();
    expect(
      within(popover).getByRole("button", { name: "Turn on" })
    ).toBeVisible();
    expect(
      within(popover).getByRole("link", { name: "Notification settings" })
    ).toHaveAttribute("href", "/dashboard/account?tab=notifications");
  });

  it("enables push notifications and persists the preference", async () => {
    const { popover, user } = await openNotifications();
    await user.click(within(popover).getByRole("button", { name: "Turn on" }));
    expect(notificationState.subscribe).toHaveBeenCalledOnce();
    expect(notificationState.updatePreferences).toHaveBeenCalledWith({
      pushEnabled: true,
    });
    expect(
      within(popover).queryByRole("button", { name: "Turn on" })
    ).toBeNull();
  });

  it("keeps a preference save failure visible after the browser subscribes", async () => {
    notificationState.subscribe.mockImplementation(async () => {
      notificationState.isSubscribed = true;
      return true;
    });
    notificationState.updatePreferences.mockRejectedValue(new Error("Offline"));
    const { popover, user } = await openNotifications();
    await user.click(within(popover).getByRole("button", { name: "Turn on" }));
    expect(within(popover).getByRole("alert")).toHaveTextContent(/try again/i);
    expect(
      within(popover).getByRole("button", { name: "Turn on" })
    ).toBeEnabled();
  });

  it("distinguishes a loading inbox from an empty inbox", async () => {
    notificationState.isNotificationsLoading = true;
    const { popover } = await openNotifications();
    expect(within(popover).getByRole("status")).toHaveTextContent(
      "Loading notifications…"
    );
    expect(within(popover).queryByText("No notifications yet")).toBeNull();
    expect(within(popover).queryByText("You’re all caught up")).toBeNull();
  });

  it("keeps invitations actionable in a populated inbox", async () => {
    notificationState.hasInvitation = true;
    const { popover } = await openNotifications();
    expect(
      within(popover).getByRole("link", { name: /Acme invitation/ })
    ).toHaveAttribute("href", "/invite/join-acme");
    expect(within(popover).queryByText("No notifications yet")).toBeNull();
  });

  it("keeps a failed enable actionable without saving a false success", async () => {
    notificationState.subscribe.mockResolvedValue(false);
    const { popover, user } = await openNotifications();
    await user.click(within(popover).getByRole("button", { name: "Turn on" }));
    expect(within(popover).getByRole("alert")).toHaveTextContent(
      /browser settings/i
    );
    expect(notificationState.updatePreferences).not.toHaveBeenCalled();
    expect(
      within(popover).getByRole("button", { name: "Turn on" })
    ).toBeEnabled();
  });

  it("restores the prompt when dismissal fails", async () => {
    notificationState.dismissPrompt.mockRejectedValue(new Error("Offline"));
    const { popover, user } = await openNotifications();
    await user.click(
      within(popover).getByRole("button", {
        name: "Dismiss notification prompt",
      })
    );
    expect(within(popover).getByRole("alert")).toHaveTextContent(/try again/i);
    expect(
      within(popover).getByRole("button", { name: "Turn on" })
    ).toBeEnabled();
  });

  it.each([
    { isSubscribed: true },
    { pushPromptDismissed: true },
    { pushEnabled: true },
    { isSupported: false },
    { permissionState: "denied" },
    { preferencesLoaded: false },
    { isLoading: true },
  ])(
    "keeps settings available without an enable prompt for %j",
    async (state) => {
      Object.assign(notificationState, state);
      const { popover } = await openNotifications();
      expect(
        within(popover).queryByRole("button", { name: "Turn on" })
      ).toBeNull();
      expect(
        within(popover).getByRole("link", { name: "Notification settings" })
      ).toBeVisible();
    }
  );

  it("returns keyboard focus to the trigger when closed", async () => {
    const { user } = await openNotifications();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveFocus();
  });
});
