"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import { ArrowUpRight, Bell, CircleHalf, Globe } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import type * as React from "react";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
import {
  themeIcons,
  themeLabels,
  themes as themeOptions,
} from "@/components/ui/theme-options";
import { useThemeToggle } from "@/components/ui/theme-toggle";
import { NavBadge } from "@/features/dashboard/components/nav-badge";

interface SidebarFooterContentProps {
  isPublic?: boolean;
  orgSlug?: string;
}

function NotificationsItem() {
  const { isMobile } = useSidebar();
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const notificationsLabel = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <SidebarMenuItem>
      <NotificationsPopover
        render={(props: React.ComponentProps<"button">) => (
          <SidebarMenuButton
            {...props}
            aria-label={notificationsLabel}
            className="group-data-[collapsible=icon]:justify-center"
            size={isMobile ? "default" : "sm"}
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

function ThemeChoices() {
  return themeOptions.map((theme) => {
    const Icon = themeIcons[theme];
    return (
      <DropdownMenuRadioItem key={theme} value={theme}>
        <Icon aria-hidden="true" className="size-4" />
        {themeLabels[theme]}
      </DropdownMenuRadioItem>
    );
  });
}

function ThemeItem() {
  const { isMobile } = useSidebar();
  const { setTheme, currentTheme, label: themeLabel } = useThemeToggle();
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(props: React.ComponentProps<"button">) => (
            <SidebarMenuButton
              {...props}
              className="group-data-[collapsible=icon]:justify-center"
              size={isMobile ? "default" : "sm"}
              tooltip={`Theme: ${themeLabel}`}
            >
              <CircleHalf aria-hidden="true" />
              <span className="flex-1 group-data-[collapsible=icon]:sr-only">
                Theme
              </span>
              <span className="text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
                {themeLabel}
              </span>
            </SidebarMenuButton>
          )}
        />
        <DropdownMenuContent
          align="start"
          className="min-w-36"
          side="top"
          sideOffset={4}
        >
          <DropdownMenuRadioGroup
            onValueChange={(value) => setTheme(String(value))}
            value={currentTheme}
          >
            <ThemeChoices />
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function SidebarFooterContent({
  orgSlug,
  isPublic,
}: SidebarFooterContentProps) {
  const { isMobile } = useSidebar();
  return (
    <>
      <NotificationsItem />
      <ThemeItem />
      {orgSlug && isPublic ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            className="group-data-[collapsible=icon]:justify-center"
            render={
              <Link href={`/${orgSlug}`} rel="noopener" target="_blank" />
            }
            size={isMobile ? "default" : "sm"}
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
