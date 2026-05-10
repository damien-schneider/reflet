"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CommandListProps } from "./command-items";

type SelectionState = {
  items: CommandListProps["items"] | null;
  selectedIndex: number;
};

const initialSelectionState: SelectionState = {
  items: null,
  selectedIndex: 0,
};

function getVisibleSelectedIndex(
  selectionState: SelectionState,
  items: CommandListProps["items"]
) {
  if (items.length === 0) {
    return 0;
  }

  if (selectionState.items !== items) {
    return 0;
  }

  return Math.min(selectionState.selectedIndex, items.length - 1);
}

export function CommandList({
  items,
  command,
  onRegisterKeyHandler,
}: CommandListProps) {
  const [selectionState, setSelectionState] = useState(initialSelectionState);
  const visibleSelectedIndex = getVisibleSelectedIndex(selectionState, items);

  useEffect(
    function registerKeyHandler() {
      const handleKeyDown = (event: KeyboardEvent): boolean => {
        if (items.length === 0) {
          return false;
        }

        if (event.key === "ArrowUp") {
          setSelectionState((previous) => ({
            items,
            selectedIndex:
              (getVisibleSelectedIndex(previous, items) + items.length - 1) %
              items.length,
          }));
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectionState((previous) => ({
            items,
            selectedIndex:
              (getVisibleSelectedIndex(previous, items) + 1) % items.length,
          }));
          return true;
        }

        if (event.key === "Enter") {
          const item = items[visibleSelectedIndex];
          if (!item) {
            return false;
          }

          event.preventDefault();
          event.stopPropagation();
          command(item);
          return true;
        }

        return false;
      };

      onRegisterKeyHandler(handleKeyDown);
    },
    [command, items, onRegisterKeyHandler, visibleSelectedIndex]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="bg-popover text-popover-foreground max-h-72 overflow-y-auto rounded-xl border p-1 shadow-lg"
      data-slot="slash-command-menu"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none",
              "hover:bg-muted",
              visibleSelectedIndex === index && "bg-muted"
            )}
            key={item.title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              command(item);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            type="button"
          >
            <div className="flex size-8 items-center justify-center rounded-md border bg-background">
              <Icon className="size-4" />
            </div>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
