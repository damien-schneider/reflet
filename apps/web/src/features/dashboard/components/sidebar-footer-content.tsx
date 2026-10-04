"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { ArrowUpRight, Bell, Globe } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import type * as React from "react";
import { NavBadge } from "@/features/dashboard/components/nav-badge";
import { DashboardFeedback } from "@/features/dashboard/components/support/dashboard-feedback";
import { DashboardSupport } from "@/features/dashboard/components/support/dashboard-support";
import { NotificationsPopover } from "@/features/notifications/notifications-popover";

interface SidebarFooterContentProps {
  isPublic?: boolean;
  orgSlug?: string;
}

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
            className="group-data-[collapsible=icon]:justify-center"
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

export function SidebarFooterContent({
  orgSlug,
  isPublic,
}: SidebarFooterContentProps) {
  return (
    <>
      <DashboardSupport />
      <DashboardFeedback />
      <NotificationsItem />
      {orgSlug && isPublic ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            className="group-data-[collapsible=icon]:justify-center"
            render={
              <Link href={`/${orgSlug}`} rel="noopener" target="_blank" />
            }
            tooltip="Open public page"
          >
            <Globe aria-hidden="true" />
            <span className="flex-1 group-data-[collapsible=icon]:sr-only">
              Open public page
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="ms-auto group-data-[collapsible=icon]:hidden"
            />
            <span className="sr-only">(opens in a new tab)</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
    </>
  );
}
