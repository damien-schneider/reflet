"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type {
  TriggerMenuEmptyProps,
  TriggerMenuGroupLabelProps,
  TriggerMenuGroupProps,
  TriggerMenuIconProps,
  TriggerMenuItemProps,
  TriggerMenuListProps,
  TriggerMenuProps,
} from "@/components/control-ui/contracts";
import { cn } from "@/components/control-ui/lib/cn";
import { skinEffects, skinId } from "@/components/control-ui/skin";
import { popupItemStructureClasses } from "@/components/control-ui/surface-variants";

// Controlled by headless engine and anchored to virtual caret rect, with no trigger button of its own.
// initialFocus/finalFocus={false} keep focus in editor, so arrows and Enter keep flowing to caret while menu is up.

export function TriggerMenu({
  open,
  onOpenChange,
  anchorRect,
  side = "top",
  align = "start",
  sideOffset = 8,
  className,
  children,
}: TriggerMenuProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next, eventDetails) => onOpenChange?.(next, eventDetails)} modal={false}>
      <PopoverPrimitive.Portal>
        {/* portal escapes both token scope and ChatLayout's overflow clip, so scope is re-asserted here */}
        <PopoverPrimitive.Positioner
          data-control-ui="trigger-menu"
          data-popup-kind="trigger-menu"
          data-control-family="popup"
          data-slot="positioner"
          data-skin={skinId()}
          data-effects={skinEffects()}
          anchor={anchorRect === null ? undefined : () => ({ getBoundingClientRect: () => anchorRect })}
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="z-[80]"
        >
          <PopoverPrimitive.Popup
            data-control-ui="trigger-menu"
            data-popup-kind="trigger-menu"
            data-control-family="popup"
            data-slot="root"
            data-surface="floating"
            data-popup-part="list-surface"
            initialFocus={false}
            finalFocus={false}
            className={cn("max-h-[min(18rem,var(--available-height))] w-64 max-w-[var(--available-width)] overflow-y-auto", className)}
          >
            {children}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function TriggerMenuList({ className, ...props }: TriggerMenuListProps) {
  return (
    <div
      data-control-ui="trigger-menu"
      data-popup-kind="trigger-menu"
      data-slot="list"
      data-control-family="popup"
      data-popup-part="list-content"
      role="listbox"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

export function TriggerMenuItem({ className, active = false, disabled = false, onMouseDown, ...props }: TriggerMenuItemProps) {
  return (
    <div
      data-control-ui="trigger-menu"
      data-popup-kind="trigger-menu"
      data-control-family="popup"
      data-slot="item"
      data-popup-part="item"
      role="option"
      // driven by editor's keyboard, not tab focus, so -1 keeps rows out of tab order
      tabIndex={-1}
      aria-selected={active}
      aria-disabled={disabled || undefined}
      data-highlighted={active ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      // keeps focus in editor on click, so insertion still targets caret
      onMouseDown={(event) => {
        event.preventDefault();
        if (disabled) return;
        onMouseDown?.(event);
      }}
      className={cn(popupItemStructureClasses, className)}
      {...props}
    />
  );
}

export function TriggerMenuIcon({ className, ...props }: TriggerMenuIconProps) {
  return (
    <span
      data-control-ui="trigger-menu"
      data-control-family="popup"
      data-popup-kind="trigger-menu"
      data-slot="icon"
      className={cn("flex size-5 shrink-0 items-center justify-center [&_svg]:size-4", className)}
      {...props}
    />
  );
}

export function TriggerMenuEmpty({ className, ...props }: TriggerMenuEmptyProps) {
  return (
    <div
      data-control-ui="trigger-menu"
      data-control-family="popup"
      data-popup-kind="trigger-menu"
      data-slot="empty"
      className={cn("px-[calc(var(--padding-x)*0.5)] py-2", className)}
      {...props}
    />
  );
}

export function TriggerMenuGroup({ className, ...props }: TriggerMenuGroupProps) {
  return (
    <div
      data-control-ui="trigger-menu"
      data-control-family="popup"
      data-popup-kind="trigger-menu"
      data-slot="group"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

export function TriggerMenuGroupLabel({ className, ...props }: TriggerMenuGroupLabelProps) {
  return (
    <div
      data-control-ui="trigger-menu"
      data-popup-kind="trigger-menu"
      data-slot="group-label"
      data-control-family="popup"
      data-popup-part="label"
      className={cn("px-[calc(var(--padding-x)*0.5)] pb-0.5 pt-1 uppercase", className)}
      {...props}
    />
  );
}
