"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@ctrl-ui/react/ui/sidebar";
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
import { NavBadge } from "./nav-badge";

interface SidebarFooterContentProps {
  isPublic?: boolean;
  orgSlug?: string;
}

export function SidebarFooterContent({
  orgSlug,
  isPublic,
}: SidebarFooterContentProps) {
  const { setTheme, currentTheme, label: themeLabel } = useThemeToggle();
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const notificationsLabel = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  return (
    <>
      <SidebarMenuItem>
        <NotificationsPopover
          render={(props: React.ComponentProps<"button">) => (
            <SidebarMenuButton
              {...props}
              aria-label={notificationsLabel}
              tooltip={notificationsLabel}
            >
              <Bell aria-hidden="true" />
              <span className="flex-1">Notifications</span>
              {hasUnread ? (
                <NavBadge count={unreadCount} tone="attention" />
              ) : null}
            </SidebarMenuButton>
          )}
        />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props: React.ComponentProps<"button">) => (
              <SidebarMenuButton {...props} tooltip={`Theme: ${themeLabel}`}>
                <CircleHalf aria-hidden="true" />
                <span className="flex-1">Theme</span>
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
              {themeOptions.map((theme) => {
                const Icon = themeIcons[theme];
                return (
                  <DropdownMenuRadioItem key={theme} value={theme}>
                    <Icon aria-hidden="true" className="size-4" />
                    {themeLabels[theme]}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {orgSlug && isPublic ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href={`/${orgSlug}`} rel="noopener" target="_blank" />
            }
            tooltip="Open public page"
          >
            <Globe aria-hidden="true" />
            <span className="flex-1">Open public page</span>
            <ArrowUpRight aria-hidden="true" className="ml-auto" />
            <span className="sr-only">(opens in a new tab)</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
    </>
  );
}
