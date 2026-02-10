"use client";

import { Menu as ListPrimitive } from "@base-ui/react/menu";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function DropdownList({ ...props }: ListPrimitive.Root.Props) {
  return <ListPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownListPortal({ ...props }: ListPrimitive.Portal.Props) {
  return <ListPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownListTrigger({ ...props }: ListPrimitive.Trigger.Props) {
  return <ListPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownListContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: ListPrimitive.Popup.Props &
  Pick<
    ListPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ListPrimitive.Portal>
      <ListPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <ListPrimitive.Popup
          className={cn(
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden",
            className
          )}
          data-slot="dropdown-menu-content"
          {...props}
        />
      </ListPrimitive.Positioner>
    </ListPrimitive.Portal>
  );
}

function DropdownListGroup({ ...props }: ListPrimitive.Group.Props) {
  return <ListPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownListLabel({
  className,
  inset,
  ...props
}: ListPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <ListPrimitive.GroupLabel
      className={cn(
        "text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
}

function DropdownListItem({
  className,
  inset,
  variant = "default",
  ...props
}: ListPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ListPrimitive.Item
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

function DropdownListSub({ ...props }: ListPrimitive.SubmenuRoot.Props) {
  return <ListPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownListSubTrigger({
  className,
  inset,
  children,
  ...props
}: ListPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <ListPrimitive.SubmenuTrigger
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 data-popup-open:bg-accent data-popup-open:text-accent-foreground flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto" />
    </ListPrimitive.SubmenuTrigger>
  );
}

function DropdownListSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownListContent>) {
  return (
    <DropdownListContent
      align={align}
      alignOffset={alignOffset}
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-md p-1 shadow-lg ring-1 duration-100 w-auto",
        className
      )}
      data-slot="dropdown-menu-sub-content"
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownListCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ListPrimitive.CheckboxItem.Props) {
  return (
    <ListPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <ListPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </ListPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ListPrimitive.CheckboxItem>
  );
}

function DropdownListRadioGroup({ ...props }: ListPrimitive.RadioGroup.Props) {
  return (
    <ListPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownListRadioItem({
  className,
  children,
  ...props
}: ListPrimitive.RadioItem.Props) {
  return (
    <ListPrimitive.RadioItem
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <ListPrimitive.RadioItemIndicator>
          <CheckIcon />
        </ListPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ListPrimitive.RadioItem>
  );
}

function DropdownListSeparator({
  className,
  ...props
}: ListPrimitive.Separator.Props) {
  return (
    <ListPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      data-slot="dropdown-menu-separator"
      {...props}
    />
  );
}

function DropdownListShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
        className
      )}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}

export {
  DropdownList,
  DropdownListPortal,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListGroup,
  DropdownListLabel,
  DropdownListItem,
  DropdownListCheckboxItem,
  DropdownListRadioGroup,
  DropdownListRadioItem,
  DropdownListSeparator,
  DropdownListShortcut,
  DropdownListSub,
  DropdownListSubTrigger,
  DropdownListSubContent,
};

// Backward compatibility aliases
export {
  DropdownList as DropdownMenu,
  DropdownListPortal as DropdownMenuPortal,
  DropdownListTrigger as DropdownMenuTrigger,
  DropdownListContent as DropdownMenuContent,
  DropdownListGroup as DropdownMenuGroup,
  DropdownListLabel as DropdownMenuLabel,
  DropdownListItem as DropdownMenuItem,
  DropdownListCheckboxItem as DropdownMenuCheckboxItem,
  DropdownListRadioGroup as DropdownMenuRadioGroup,
  DropdownListRadioItem as DropdownMenuRadioItem,
  DropdownListSeparator as DropdownMenuSeparator,
  DropdownListShortcut as DropdownMenuShortcut,
  DropdownListSub as DropdownMenuSub,
  DropdownListSubTrigger as DropdownMenuSubTrigger,
  DropdownListSubContent as DropdownMenuSubContent,
};
