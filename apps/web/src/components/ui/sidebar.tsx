"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ponytail: @ctrl-ui/react's sidebar has no group-content or menu-action. Delete on upstream parity.

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full text-sm", className)}
      data-control-family="sidebar"
      data-control-ui="sidebar"
      data-slot="group-content"
      {...props}
    />
  );
}

export function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-open:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground md:opacity-0",
          className
        ),
      },
      props
    ),
    render,
    state: {},
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenu as SidebarList,
  SidebarMenuButton,
  SidebarMenuButton as SidebarListButton,
  SidebarMenuItem,
  SidebarMenuItem as SidebarListItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";

export { SidebarMenuAction as SidebarListAction };
