"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@ctrl-ui/react/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { Fragment, type ReactNode } from "react";

export interface MilestoneAction {
  danger?: boolean;
  icon: ReactNode;
  label: string;
  run: () => void | Promise<void>;
}

export function MilestoneContextMenu({
  actions,
  children,
}: {
  actions: MilestoneAction[];
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <Fragment key={action.label}>
            {action.danger ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              className={action.danger ? "menu-item-danger" : undefined}
              onClick={action.run}
            >
              {action.icon}
              {action.label}
            </ContextMenuItem>
          </Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function MilestoneActionsMenu({
  actions,
  milestoneName,
}: {
  actions: MilestoneAction[];
  milestoneName: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${milestoneName}`}
        className="absolute top-1/2 right-1 z-10 size-6 -translate-y-1/2 text-band-foreground opacity-0 pointer-coarse:opacity-100 transition-opacity group-focus-within/seg:opacity-100 group-hover/seg:opacity-100"
        iconOnly
        size="xs"
        variant="ghost"
      >
        <DotsThreeVertical weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {actions.map((action) => (
          <Fragment key={action.label}>
            {action.danger ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className={action.danger ? "menu-item-danger" : undefined}
              onClick={action.run}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
