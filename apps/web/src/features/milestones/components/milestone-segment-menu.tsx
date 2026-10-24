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
              onClick={action.run}
              tone={action.danger ? "danger" : "neutral"}
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
      <span className="absolute top-1/2 right-1 z-10 flex -translate-y-1/2 opacity-0 pointer-coarse:opacity-100 transition-opacity group-focus-within/seg:opacity-100 group-hover/seg:opacity-100">
        <DropdownMenuTrigger
          aria-label={`Actions for ${milestoneName}`}
          className="size-6 [--cui-button-foreground:var(--band-foreground)] [--cui-button-hover-foreground:var(--band-foreground)]"
          iconOnly
          size="xs"
          variant="ghost"
        >
          <DotsThreeVertical weight="bold" />
        </DropdownMenuTrigger>
      </span>
      <DropdownMenuContent>
        {actions.map((action) => (
          <Fragment key={action.label}>
            {action.danger ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              onClick={action.run}
              tone={action.danger ? "danger" : "neutral"}
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
