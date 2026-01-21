"use client";

import {
  IconDotsVertical,
  IconFolder,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import type * as React from "react";

import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarList,
  SidebarListAction,
  SidebarListButton,
  SidebarListItem,
  useSidebar,
} from "@/components/ui/sidebar";

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
      <SidebarList>
        {items.map((item) => {
          const displayTitle = item.title ?? item.name ?? "";
          return (
            <SidebarListItem key={displayTitle}>
              <SidebarListButton
                render={(props) => (
                  <a href={item.url} {...props}>
                    <item.icon />
                    <span>{displayTitle}</span>
                  </a>
                )}
              />
              <DropdownList>
                <DropdownListTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <SidebarListAction showOnHover {...props}>
                      <IconDotsVertical />
                      <span className="sr-only">More</span>
                    </SidebarListAction>
                  )}
                />
                <DropdownListContent
                  align={isMobile ? "end" : "start"}
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                >
                  <DropdownListItem>
                    <IconFolder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownListItem>
                  <DropdownListItem>
                    <IconShare className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownListItem>
                  <DropdownListSeparator />
                  <DropdownListItem>
                    <IconTrash className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownListItem>
                </DropdownListContent>
              </DropdownList>
            </SidebarListItem>
          );
        })}
        <SidebarListItem>
          <SidebarListButton className="text-sidebar-foreground/70">
            <IconDotsVertical className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarListButton>
        </SidebarListItem>
      </SidebarList>
    </SidebarGroup>
  );
}
