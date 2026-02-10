"use client";

import {
  ArrowUpRight,
  Bell,
  Check,
  CircleHalf,
  Globe,
} from "@phosphor-icons/react";
import Link from "next/link";
import type * as React from "react";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
import { SidebarListButton, SidebarListItem } from "@/components/ui/sidebar";
import {
  type Theme,
  themeIcons,
  themeLabels,
  themes as themeOptions,
  useThemeToggle,
} from "@/components/ui/theme-toggle";

interface SidebarFooterContentProps {
  orgSlug?: string;
  isPublic?: boolean;
}

export function SidebarFooterContent({
  orgSlug,
  isPublic,
}: SidebarFooterContentProps) {
  const { mounted: themeMounted, setTheme, currentTheme } = useThemeToggle();

  return (
    <>
      <SidebarListItem>
        <NotificationsPopover
          render={(props: React.ComponentProps<"button">) => (
            <SidebarListButton {...props}>
              <Bell className="h-4 w-4" />
              <span className="flex-1">Notifications</span>
            </SidebarListButton>
          )}
        />
      </SidebarListItem>
      <SidebarListItem>
        <DropdownList>
          <DropdownListTrigger
            render={(props: React.ComponentProps<"button">) => (
              <SidebarListButton {...props} disabled={!themeMounted}>
                <CircleHalf className="h-4 w-4" />
                <span className="flex-1">Theme</span>
              </SidebarListButton>
            )}
          />
          <DropdownListContent
            align="start"
            className="min-w-36"
            side="top"
            sideOffset={4}
          >
            {themeOptions.map((t: Theme) => {
              const Icon = themeIcons[t];
              return (
                <DropdownListItem key={t} onClick={() => setTheme(t)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1">{themeLabels[t]}</span>
                  {currentTheme === t && <Check className="ml-auto h-4 w-4" />}
                </DropdownListItem>
              );
            })}
          </DropdownListContent>
        </DropdownList>
      </SidebarListItem>
      {orgSlug && isPublic && (
        <SidebarListItem>
          <SidebarListButton
            render={(props) => (
              <Link
                href={`/${orgSlug}`}
                rel="noopener"
                target="_blank"
                {...props}
              >
                <Globe className="h-4 w-4" />
                <span className="flex-1">Go to public page</span>
                <ArrowUpRight className="ml-auto size-4" />
              </Link>
            )}
          />
        </SidebarListItem>
      )}
    </>
  );
}
