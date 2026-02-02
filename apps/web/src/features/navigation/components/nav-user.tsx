"use client";

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react";
import type * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownList,
  DropdownListContent,
  DropdownListGroup,
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar/context";
import {
  SidebarList,
  SidebarListButton,
  SidebarListItem,
} from "@/components/ui/sidebar/menu";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarList>
      <SidebarListItem>
        <DropdownList>
          <DropdownListTrigger
            render={(props: React.ComponentProps<"button">) => (
              <SidebarListButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
                {...props}
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage alt={user.name} src={user.avatar} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </span>
                </div>
                <IconDotsVertical className="ml-auto size-4" />
              </SidebarListButton>
            )}
          />
          <DropdownListContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownListLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage alt={user.name} src={user.avatar} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownListLabel>
            <DropdownListSeparator />
            <DropdownListGroup>
              <DropdownListItem>
                <IconUserCircle className="mr-2 size-4" />
                Account
              </DropdownListItem>
              <DropdownListItem>
                <IconCreditCard className="mr-2 size-4" />
                Billing
              </DropdownListItem>
              <DropdownListItem>
                <IconNotification className="mr-2 size-4" />
                Notifications
              </DropdownListItem>
            </DropdownListGroup>
            <DropdownListSeparator />
            <DropdownListItem>
              <IconLogout className="mr-2 size-4" />
              Log out
            </DropdownListItem>
          </DropdownListContent>
        </DropdownList>
      </SidebarListItem>
    </SidebarList>
  );
}
