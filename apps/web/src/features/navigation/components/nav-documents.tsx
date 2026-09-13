"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import {
  IconDotsVertical,
  IconFolder,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";

export function NavDocuments({
  items,
  title = "Documents",
}: {
  items: {
    name?: string;
    title?: string;
    url: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[];
  title?: string;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const displayTitle = item.title ?? item.name ?? "";
          return (
            <SidebarMenuItem key={displayTitle}>
              <SidebarMenuButton render={<Link href={item.url} />}>
                <item.icon />
                <span>{displayTitle}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <SidebarMenuAction showOnHover {...props}>
                      <IconDotsVertical />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  )}
                />
                <DropdownMenuContent
                  align={isMobile ? "end" : "start"}
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                >
                  <DropdownMenuItem>
                    <IconFolder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconShare className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <IconTrash className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <IconDotsVertical className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
