"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { commandPaletteOpenAtom } from "@/store/dashboard-atoms";

export function CommandPaletteTrigger() {
  const setOpen = useSetAtom(commandPaletteOpenAtom);

  return (
    <Button
      className="h-8 w-full justify-start gap-2 text-muted-foreground group-data-[collapsible=icon]:hidden"
      onClick={() => setOpen(true)}
      variant="outline"
    >
      <MagnifyingGlass className="size-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
