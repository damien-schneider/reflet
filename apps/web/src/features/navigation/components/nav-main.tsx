"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ctrl-ui/react/ui/sidebar";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";

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
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton render={<Link href={item.url} />}>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
              <SidebarMenuAction showOnHover>
                <IconPlus />
                <span className="sr-only">Add Project</span>
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <IconSearch className="text-sidebar-foreground/70" />
              <span>MagnifyingGlass</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
