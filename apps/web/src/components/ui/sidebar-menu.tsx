"use client";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("gap-0 flex w-full min-w-0 flex-col", className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-item relative", className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-left text-sm whitespace-nowrap transition-[width,height,padding] duration-200 ease-in-out group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! focus-visible:ring-2 data-active:font-medium peer/menu-button flex w-full items-center overflow-hidden outline-hidden group/menu-button disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 [&>span]:transition-opacity [&>span]:duration-200 [&>span]:ease-in-out group-data-[collapsible=icon]:[&>span]:opacity-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-8 text-sm group-data-[collapsible=icon]:p-2!",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
        sm: "h-7 text-xs group-data-[collapsible=icon]:p-2!",
      },
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
    },
  }
);

export function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(sidebarMenuButtonVariants({ size, variant }), className),
      },
      props
    ),
    render,
    state: {
      active: isActive,
      sidebar: "menu-button",
      size,
      slot: "sidebar-menu-button",
    },
  });
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
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 aspect-square w-5 rounded-md p-0 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 focus-visible:ring-2 [&>svg]:size-4 flex items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
          showOnHover &&
            "peer-data-active/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-open:opacity-100 md:opacity-0",
          className
        ),
      },
      props
    ),
    render,
    state: {
      sidebar: "menu-action",
      slot: "sidebar-menu-action",
    },
  });
}

export function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 rounded-md px-1 text-xs font-medium peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden",
        className
      )}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      {...props}
    />
  );
}

export function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-8 gap-2 rounded-md px-2 flex items-center justify-center",
        className
      )}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      <Spinner
        className={cn("size-4 text-muted-foreground", showIcon && "shrink-0")}
        data-sidebar="menu-skeleton-spinner"
      />
    </div>
  );
}

export function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "border-sidebar-border mx-3.5 translate-x-px gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden flex min-w-0 flex-col",
        className
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

export function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-sub-item relative", className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

export function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground h-7 gap-2 rounded-md px-2 focus-visible:ring-2 data-[size=md]:text-sm data-[size=sm]:text-xs [&>svg]:size-4 flex min-w-0 -translate-x-px items-center overflow-hidden outline-hidden group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0",
          className
        ),
      },
      props
    ),
    render,
    state: {
      active: isActive,
      sidebar: "menu-sub-button",
      size,
      slot: "sidebar-menu-sub-button",
    },
  });
}
