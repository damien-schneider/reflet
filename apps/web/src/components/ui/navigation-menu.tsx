import { NavigationMenu as NavigationListPrimitive } from "@base-ui/react/navigation-menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

function NavigationList({
  className,
  children,
  ...props
}: NavigationListPrimitive.Root.Props) {
  return (
    <NavigationListPrimitive.Root
      className={cn(
        "max-w-max group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      data-slot="navigation-menu"
      {...props}
    >
      {children}
      <NavigationListPositioner />
    </NavigationListPrimitive.Root>
  );
}

function NavigationListList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationListPrimitive.List>) {
  return (
    <NavigationListPrimitive.List
      className={cn(
        "gap-0 group flex flex-1 list-none items-center justify-center",
        className
      )}
      data-slot="navigation-menu-list"
      {...props}
    />
  );
}

function NavigationListItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationListPrimitive.Item>) {
  return (
    <NavigationListPrimitive.Item
      className={cn("relative", className)}
      data-slot="navigation-menu-item"
      {...props}
    />
  );
}

const navigationListTriggerStyle = cva(
  "bg-background hover:bg-muted focus:bg-muted data-open:hover:bg-muted data-open:focus:bg-muted data-open:bg-muted/50 focus-visible:ring-ring/50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:opacity-50 group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center disabled:pointer-events-none outline-none"
);

function NavigationListTrigger({
  className,
  children,
  ...props
}: NavigationListPrimitive.Trigger.Props) {
  return (
    <NavigationListPrimitive.Trigger
      className={cn(navigationListTriggerStyle(), "group", className)}
      data-slot="navigation-menu-trigger"
      {...props}
    >
      {children}{" "}
      <CaretDownIcon
        aria-hidden="true"
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-open/navigation-menu-trigger:rotate-180 group-data-popup-open/navigation-menu-trigger:rotate-180"
      />
    </NavigationListPrimitive.Trigger>
  );
}

function NavigationListContent({
  className,
  ...props
}: NavigationListPrimitive.Content.Props) {
  return (
    <NavigationListPrimitive.Content
      className={cn(
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:ring-foreground/10 p-1 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:rounded-lg group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:duration-300 h-full w-auto **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      data-slot="navigation-menu-content"
      {...props}
    />
  );
}

function NavigationListPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: NavigationListPrimitive.Positioner.Props) {
  return (
    <NavigationListPrimitive.Portal>
      <NavigationListPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "transition-[top,left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 isolate z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] data-[instant]:transition-none",
          className
        )}
        side={side}
        sideOffset={sideOffset}
        {...props}
      >
        <NavigationListPrimitive.Popup className="bg-popover text-popover-foreground ring-foreground/10 rounded-lg shadow ring-1 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin)">
          <NavigationListPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationListPrimitive.Popup>
      </NavigationListPrimitive.Positioner>
    </NavigationListPrimitive.Portal>
  );
}

function NavigationListLink({
  className,
  ...props
}: NavigationListPrimitive.Link.Props) {
  return (
    <NavigationListPrimitive.Link
      className={cn(
        "data-active:focus:bg-muted data-active:hover:bg-muted data-active:bg-muted/50 focus-visible:ring-ring/50 hover:bg-muted focus:bg-muted flex items-center gap-2 rounded-lg p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4 [[data-slot=navigation-menu-content]_&]:rounded-md",
        className
      )}
      data-slot="navigation-menu-link"
      {...props}
    />
  );
}

function NavigationListIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationListPrimitive.Icon>) {
  return (
    <NavigationListPrimitive.Icon
      className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      data-slot="navigation-menu-indicator"
      {...props}
    >
      <div className="bg-border rounded-tl-sm shadow-md relative top-[60%] h-2 w-2 rotate-45" />
    </NavigationListPrimitive.Icon>
  );
}

export {
  NavigationList,
  NavigationListContent,
  NavigationListIndicator,
  NavigationListItem,
  NavigationListLink,
  NavigationListList,
  NavigationListTrigger,
  navigationListTriggerStyle,
  NavigationListPositioner,
};
