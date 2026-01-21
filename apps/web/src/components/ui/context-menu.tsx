"use client";

import { ContextMenu as ContextListPrimitive } from "@base-ui/react/context-menu";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function ContextList({ ...props }: ContextListPrimitive.Root.Props) {
  return <ContextListPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextListPortal({ ...props }: ContextListPrimitive.Portal.Props) {
  return (
    <ContextListPrimitive.Portal data-slot="context-menu-portal" {...props} />
  );
}

function ContextListTrigger({
  className,
  ...props
}: ContextListPrimitive.Trigger.Props) {
  return (
    <ContextListPrimitive.Trigger
      className={cn("select-none", className)}
      data-slot="context-menu-trigger"
      {...props}
    />
  );
}

function ContextListContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  ...props
}: ContextListPrimitive.Popup.Props &
  Pick<
    ContextListPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ContextListPrimitive.Portal>
      <ContextListPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <ContextListPrimitive.Popup
          className={cn(
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none",
            className
          )}
          data-slot="context-menu-content"
          {...props}
        />
      </ContextListPrimitive.Positioner>
    </ContextListPrimitive.Portal>
  );
}

function ContextListGroup({ ...props }: ContextListPrimitive.Group.Props) {
  return (
    <ContextListPrimitive.Group data-slot="context-menu-group" {...props} />
  );
}

function ContextListLabel({
  className,
  inset,
  ...props
}: ContextListPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <ContextListPrimitive.GroupLabel
      className={cn(
        "text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-label"
      {...props}
    />
  );
}

function ContextListItem({
  className,
  inset,
  variant = "default",
  ...props
}: ContextListPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextListPrimitive.Item
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive focus:*:[svg]:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/context-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

function ContextListSub({ ...props }: ContextListPrimitive.SubmenuRoot.Props) {
  return (
    <ContextListPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
  );
}

function ContextListSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextListPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <ContextListPrimitive.SubmenuTrigger
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-sub-trigger"
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto" />
    </ContextListPrimitive.SubmenuTrigger>
  );
}

function ContextListSubContent({
  ...props
}: React.ComponentProps<typeof ContextListContent>) {
  return (
    <ContextListContent
      className="shadow-lg"
      data-slot="context-menu-sub-content"
      side="right"
      {...props}
    />
  );
}

function ContextListCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ContextListPrimitive.CheckboxItem.Props) {
  return (
    <ContextListPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="context-menu-checkbox-item"
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextListPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </ContextListPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextListPrimitive.CheckboxItem>
  );
}

function ContextListRadioGroup({
  ...props
}: ContextListPrimitive.RadioGroup.Props) {
  return (
    <ContextListPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  );
}

function ContextListRadioItem({
  className,
  children,
  ...props
}: ContextListPrimitive.RadioItem.Props) {
  return (
    <ContextListPrimitive.RadioItem
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      data-slot="context-menu-radio-item"
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextListPrimitive.RadioItemIndicator>
          <CheckIcon />
        </ContextListPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextListPrimitive.RadioItem>
  );
}

function ContextListSeparator({
  className,
  ...props
}: ContextListPrimitive.Separator.Props) {
  return (
    <ContextListPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      data-slot="context-menu-separator"
      {...props}
    />
  );
}

function ContextListShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
        className
      )}
      data-slot="context-menu-shortcut"
      {...props}
    />
  );
}

export {
  ContextList,
  ContextListTrigger,
  ContextListContent,
  ContextListItem,
  ContextListCheckboxItem,
  ContextListRadioItem,
  ContextListLabel,
  ContextListSeparator,
  ContextListShortcut,
  ContextListGroup,
  ContextListPortal,
  ContextListSub,
  ContextListSubContent,
  ContextListSubTrigger,
  ContextListRadioGroup,
};
