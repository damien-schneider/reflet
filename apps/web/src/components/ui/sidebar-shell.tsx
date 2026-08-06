"use client";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { SidebarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  useSidebar,
} from "./sidebar-context";

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, hovered, setHovered, openMobile, setOpenMobile } =
    useSidebar();

  const collapsibleState = hovered ? "" : "icon";

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className
        )}
        data-slot="sidebar"
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
        <SheetContent
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          data-mobile="true"
          data-sidebar="sidebar"
          data-slot="sidebar"
          dir={dir}
          side={side}
          style={{
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block w-(--sidebar-width-icon) shrink-0"
      data-collapsible={collapsibleState}
      data-side={side}
      data-slot="sidebar"
      data-state="collapsed"
      data-variant={variant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gap: reserves icon-width layout space */}
      <div
        className="relative w-[--sidebar-width-icon] bg-transparent"
        data-slot="sidebar-gap"
      />
      {/* Container: fixed sidebar panel, expands on hover as overlay */}
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width,padding,box-shadow] duration-200 ease-in-out md:flex overflow-hidden",
          side === "left" && "left-0 border-r",
          side === "right" && "right-0 border-l",
          hovered && "z-30 shadow-2xl shadow-black/20",
          className
        )}
        data-side={side}
        data-slot="sidebar-container"
        style={{
          width: hovered ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON,
        }}
        {...props}
      >
        <div
          className={cn(
            "bg-sidebar flex size-full flex-col min-w-(--sidebar-width)",
            variant === "floating" &&
              "ring-sidebar-border rounded-lg shadow-sm ring-1"
          )}
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn(className)}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <SidebarIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarRail({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      aria-label="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      onClick={toggleSidebar}
      tabIndex={-1}
      title="Toggle Sidebar"
      {...props}
    />
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("relative min-w-0 flex-1", className)}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

export function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn("bg-background h-8 w-full shadow-none", className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("gap-2 p-2 flex flex-col", className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("gap-2 p-2 flex flex-col", className)}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

export function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "no-scrollbar gap-0 flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      data-sidebar="content"
      data-slot="sidebar-content"
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-2 relative flex w-full min-w-0 flex-col", className)}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

export function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "text-sidebar-foreground/70 ring-sidebar-ring h-8 rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 flex shrink-0 items-center outline-hidden [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        ),
      },
      props
    ),
    render,
    state: {
      sidebar: "group-label",
      slot: "sidebar-group-label",
    },
  });
}

export function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 w-5 rounded-md p-0 focus-visible:ring-2 [&>svg]:size-4 flex aspect-square items-center justify-center outline-hidden transition-transform [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden",
          className
        ),
      },
      props
    ),
    render,
    state: {
      sidebar: "group-action",
      slot: "sidebar-group-action",
    },
  });
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm w-full", className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}
