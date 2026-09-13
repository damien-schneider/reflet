"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@ctrl-ui/react/ui/sidebar";
import {
  ArrowUpRight,
  Bell,
  Check,
  CircleHalf,
  Globe,
} from "@phosphor-icons/react";
import Link from "next/link";
import type * as React from "react";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
import {
  type Theme,
  themeIcons,
  themeLabels,
  themes as themeOptions,
  useThemeToggle,
} from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface SidebarFooterContentProps {
  isPublic?: boolean;
  orgSlug?: string;
}

export function SidebarFooterContent({
  orgSlug,
  isPublic,
}: SidebarFooterContentProps) {
  const { mounted: themeMounted, setTheme, currentTheme } = useThemeToggle();

  return (
    <>
      <SidebarMenuItem>
        <NotificationsPopover
          render={(props: React.ComponentProps<"button">) => (
            <SidebarMenuButton
              {...props}
              className={cn(props.className, "text-start")}
            >
              <Bell className="h-4 w-4" />
              <span className="flex-1">Notifications</span>
            </SidebarMenuButton>
          )}
        />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props: React.ComponentProps<"button">) => (
              <SidebarMenuButton
                {...props}
                className={cn(props.className, "text-start")}
                disabled={!themeMounted}
              >
                <CircleHalf className="h-4 w-4" />
                <span className="flex-1">Theme</span>
              </SidebarMenuButton>
            )}
          />
          <DropdownMenuContent
            align="start"
            className="min-w-36"
            side="top"
            sideOffset={4}
          >
            {themeOptions.map((t: Theme) => {
              const Icon = themeIcons[t];
              return (
                <DropdownMenuItem key={t} onClick={() => setTheme(t)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1">{themeLabels[t]}</span>
                  {currentTheme === t && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {orgSlug && isPublic && (
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href={`/${orgSlug}`} rel="noopener" target="_blank" />
            }
          >
            <Globe className="h-4 w-4" />
            <span className="flex-1">Go to public page</span>
            <ArrowUpRight className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </>
  );
}
