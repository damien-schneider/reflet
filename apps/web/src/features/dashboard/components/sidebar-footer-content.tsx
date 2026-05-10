"use client";

import {
  ArrowUpRight,
  Bell,
  Check,
  CircleHalf,
  Globe,
} from "@phosphor-icons/react";
import Link from "next/link";
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
      <SidebarListItem>
        <NotificationsPopover render={<SidebarListButton />}>
          <Bell className="size-4" />
          <span className="flex-1">Notifications</span>
        </NotificationsPopover>
      </SidebarListItem>
      <SidebarListItem>
        <DropdownList>
          <DropdownListTrigger
            render={<SidebarListButton disabled={!themeMounted} />}
          >
            <CircleHalf className="size-4" />
            <span className="flex-1">Theme</span>
          </DropdownListTrigger>
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
                  <Icon className="mr-2 size-4" />
                  <span className="flex-1">{themeLabels[t]}</span>
                  {currentTheme === t && <Check className="ml-auto size-4" />}
                </DropdownListItem>
              );
            })}
          </DropdownListContent>
        </DropdownList>
      </SidebarListItem>
      {orgSlug && isPublic && (
        <SidebarListItem>
          <SidebarListButton
            render={
              <Link href={`/${orgSlug}`} rel="noopener" target="_blank" />
            }
          >
            <Globe className="size-4" />
            <span className="flex-1">Go to public page</span>
            <ArrowUpRight className="ml-auto size-4" />
          </SidebarListButton>
        </SidebarListItem>
      )}
    </>
  );
}
