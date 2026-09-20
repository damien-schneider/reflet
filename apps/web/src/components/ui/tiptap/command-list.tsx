"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CommandListProps } from "./command-items";

export function CommandList({
  items,
  command,
  onRegisterKeyHandler,
}: CommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        const selected = items[selectedIndex];
        if (selected) {
          command(selected);
        }
        return true;
      }

      return false;
    };

    onRegisterKeyHandler(handleKeyDown);
  }, [items, command, selectedIndex, onRegisterKeyHandler]);

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
        const isSelected = selectedIndex === index;
        return (
          <Button
            active={isSelected}
            className={cn(
              "h-auto w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
              isSelected && "bg-muted"
            )}
            key={item.title}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              command(item);
            }}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            size="md"
            variant="ghost"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
              <Icon className="h-4 w-4" />
            </span>
            <span className="block">
              <span className="block font-medium">{item.title}</span>
              <span className="block text-muted-foreground text-xs">
                {item.description}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
