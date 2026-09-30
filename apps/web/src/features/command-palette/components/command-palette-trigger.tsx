"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Kbd, KbdGroup } from "@ctrl-ui/react/ui/kbd";
import { useSidebar } from "@ctrl-ui/react/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";
import { commandPaletteOpenAtom } from "@/store/dashboard-atoms";
import { useModifierKeyLabel } from "../hooks/use-modifier-key-label";

export function CommandPaletteTrigger() {
  const setOpen = useSetAtom(commandPaletteOpenAtom);
  const { state, isMobile } = useSidebar();
  const modifierKey = useModifierKeyLabel();
  const isCollapsed = state === "collapsed" && !isMobile;
  const shortcut = (
    <KbdGroup>
      <Kbd>{modifierKey}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-keyshortcuts="Meta+K Control+K"
            aria-label="Search"
            className={isCollapsed ? undefined : "w-full justify-start"}
            iconOnly={isCollapsed}
            onClick={() => setOpen(true)}
            variant="surface"
          />
        }
      >
        <MagnifyingGlass aria-hidden="true" className="size-4" />
        {isCollapsed ? null : (
          <>
            <span className="flex-1 text-start text-muted-foreground">
              Search…
            </span>
            {shortcut}
          </>
        )}
      </TooltipTrigger>
      <TooltipContent hidden={!isCollapsed} side="right">
        <span className="flex items-center gap-2">
          Search
          {shortcut}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
