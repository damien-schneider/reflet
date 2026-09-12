"use client";

import { Menu as ListPrimitive } from "@base-ui/react/menu";
import { skinEffects, skinId } from "@ctrl-ui/react/skin";
import { popupItemStructureClasses } from "@ctrl-ui/react/surface-variants";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ponytail: @ctrl-ui/react ships only root/trigger/content/item/label/separator, and its
// content/item pin positioning and forbid `render`. These mirror its data attributes so the
// skin paints them. Delete on upstream parity.

function DropdownListContent({
  align = "start",
  alignOffset,
  className,
  children,
  side = "bottom",
  sideOffset = 6,
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
        className="z-[80]"
        data-effects={skinEffects()}
        data-skin={skinId()}
        side={side}
        sideOffset={sideOffset}
      >
        <ListPrimitive.Popup
          className={cn("min-w-[max(11rem,var(--anchor-width))]", className)}
          data-control-family="popup"
          data-control-ui="dropdown-menu"
          data-popup-part="list-surface"
          data-slot="content"
          data-surface="floating"
          {...props}
        >
          {children}
        </ListPrimitive.Popup>
      </ListPrimitive.Positioner>
    </ListPrimitive.Portal>
  );
}

function DropdownListItem({ className, ...props }: ListPrimitive.Item.Props) {
  return (
    <ListPrimitive.Item
      className={cn(popupItemStructureClasses, className)}
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-popup-part="item"
      data-slot="item"
      {...props}
    />
  );
}

function DropdownListPortal({ ...props }: ListPrimitive.Portal.Props) {
  return <ListPrimitive.Portal {...props} />;
}

function DropdownListGroup({ ...props }: ListPrimitive.Group.Props) {
  return (
    <ListPrimitive.Group
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-slot="group"
      {...props}
    />
  );
}

function DropdownListSub({ ...props }: ListPrimitive.SubmenuRoot.Props) {
  return <ListPrimitive.SubmenuRoot {...props} />;
}

function DropdownListSubTrigger({
  className,
  children,
  ...props
}: ListPrimitive.SubmenuTrigger.Props) {
  return (
    <ListPrimitive.SubmenuTrigger
      className={cn(popupItemStructureClasses, className)}
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-popup-part="item"
      data-slot="item"
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto" />
    </ListPrimitive.SubmenuTrigger>
  );
}

function DropdownListSubContent(
  props: React.ComponentProps<typeof DropdownListContent>
) {
  return (
    <DropdownListContent
      alignOffset={-3}
      side="right"
      sideOffset={0}
      {...props}
    />
  );
}

function DropdownListCheckboxItem({
  className,
  children,
  ...props
}: ListPrimitive.CheckboxItem.Props) {
  return (
    <ListPrimitive.CheckboxItem
      className={cn(popupItemStructureClasses, "relative pr-8", className)}
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-popup-part="item"
      data-slot="item"
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <ListPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </ListPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ListPrimitive.CheckboxItem>
  );
}

function DropdownListRadioGroup({ ...props }: ListPrimitive.RadioGroup.Props) {
  return <ListPrimitive.RadioGroup {...props} />;
}

function DropdownListRadioItem({
  className,
  children,
  ...props
}: ListPrimitive.RadioItem.Props) {
  return (
    <ListPrimitive.RadioItem
      className={cn(popupItemStructureClasses, "relative pr-8", className)}
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-popup-part="item"
      data-slot="item"
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <ListPrimitive.RadioItemIndicator>
          <CheckIcon />
        </ListPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ListPrimitive.RadioItem>
  );
}

function DropdownListShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest", className)}
      data-control-family="popup"
      data-control-ui="dropdown-menu"
      data-popup-part="shortcut"
      data-slot="shortcut"
      {...props}
    />
  );
}

export {
  DropdownListCheckboxItem,
  DropdownListCheckboxItem as DropdownMenuCheckboxItem,
  DropdownListContent,
  DropdownListContent as DropdownMenuContent,
  DropdownListGroup,
  DropdownListGroup as DropdownMenuGroup,
  DropdownListItem,
  DropdownListItem as DropdownMenuItem,
  DropdownListPortal,
  DropdownListPortal as DropdownMenuPortal,
  DropdownListRadioGroup,
  DropdownListRadioGroup as DropdownMenuRadioGroup,
  DropdownListRadioItem,
  DropdownListRadioItem as DropdownMenuRadioItem,
  DropdownListShortcut,
  DropdownListShortcut as DropdownMenuShortcut,
  DropdownListSub,
  DropdownListSub as DropdownMenuSub,
  DropdownListSubContent,
  DropdownListSubContent as DropdownMenuSubContent,
  DropdownListSubTrigger,
  DropdownListSubTrigger as DropdownMenuSubTrigger,
  DropdownMenu as DropdownList,
  DropdownMenu,
  DropdownMenuLabel as DropdownListLabel,
  DropdownMenuLabel,
  DropdownMenuSeparator as DropdownListSeparator,
  DropdownMenuSeparator,
  DropdownMenuTrigger as DropdownListTrigger,
  DropdownMenuTrigger,
};
