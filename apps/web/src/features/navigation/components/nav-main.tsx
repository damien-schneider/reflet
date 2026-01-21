"use client";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import type * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarList,
  SidebarListAction,
  SidebarListButton,
  SidebarListItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    isActive?: boolean;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarList>
          {items.map((item) => (
            <SidebarListItem key={item.title}>
              <SidebarListButton
                render={(props: React.ComponentProps<"a">) => (
                  <a href={item.url} {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                )}
                tooltip={item.title}
              />
              <SidebarListAction showOnHover>
                <IconPlus />
                <span className="sr-only">Add Project</span>
              </SidebarListAction>
            </SidebarListItem>
          ))}
          <SidebarListItem>
            <SidebarListButton className="text-sidebar-foreground/70">
              <IconSearch className="text-sidebar-foreground/70" />
              <span>MagnifyingGlass</span>
            </SidebarListButton>
          </SidebarListItem>
        </SidebarList>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
