"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CommandListProps } from "./command-items";

export function CommandList({
  items,
  command,
  onRegisterKeyHandler,
}: CommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): boolean => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    };

    onRegisterKeyHandler(handleKeyDown);
  }, [items.length, selectedIndex, selectItem, onRegisterKeyHandler]);

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
              selectedIndex === index && "bg-muted"
            )}
            key={item.title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectItem(index);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            type="button"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
              <Icon className="h-4 w-4" />
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
