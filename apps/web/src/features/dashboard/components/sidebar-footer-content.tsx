"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { Bell } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type * as React from "react";
import { NavBadge } from "@/features/dashboard/components/nav-badge";
import { DashboardFeedback } from "@/features/dashboard/components/support/dashboard-feedback";
import { DashboardSupport } from "@/features/dashboard/components/support/dashboard-support";
import { NotificationsPopover } from "@/features/notifications/notifications-popover";

function NotificationsItem() {
  const { setOpenMobile } = useSidebar();
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const notificationsLabel = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <SidebarMenuItem>
      <NotificationsPopover
        onSettingsNavigate={() => setOpenMobile(false)}
        render={(props: React.ComponentProps<"button">) => (
          <SidebarMenuButton
            {...props}
            aria-label={notificationsLabel}
            tooltip={notificationsLabel}
          >
            <Bell aria-hidden="true" />
            <span className="flex-1 group-data-[collapsible=icon]:sr-only">
              Notifications
            </span>
            {hasUnread ? (
              <NavBadge count={unreadCount} tone="attention" />
            ) : null}
          </SidebarMenuButton>
        )}
      />
    </SidebarMenuItem>
  );
}

export function SidebarFooterContent() {
  return (
    <>
      <DashboardSupport />
      <DashboardFeedback />
      <NotificationsItem />
    </>
  );
}
