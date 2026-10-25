"use client";

import {
  Command,
  CommandItem,
  CommandItemContent,
  CommandItemDescription,
  CommandItemTitle,
  CommandList as CommandListbox,
} from "@ctrl-ui/react/ui/command";
import { type Ref, useImperativeHandle, useState } from "react";
import type { CommandListHandle, CommandListProps } from "./command-items";

const revealOption = (node: HTMLElement | null) => {
  node?.scrollIntoView({ block: "nearest" });
};

export function CommandList({
  items,
  command,
  ref,
}: CommandListProps & { ref?: Ref<CommandListHandle> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previousItems, setPreviousItems] = useState(items);

  if (previousItems !== items) {
    setPreviousItems(items);
    setSelectedIndex(0);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }): boolean => {
      if (items.length === 0) {
        return false;
      }

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
    },
  }));

  if (items.length === 0) {
    return null;
  }

  const selectByTitle = (title: string) => {
    const index = items.findIndex((item) => item.title === title);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  };

  return (
    <Command
      className="w-72"
      onValueChange={selectByTitle}
      shouldFilter={false}
      value={items[selectedIndex]?.title ?? ""}
    >
      <CommandListbox label="Insert block">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <CommandItem
              key={item.title}
              onMouseDown={(event) => event.preventDefault()}
              onSelect={() => command(item)}
              ref={index === selectedIndex ? revealOption : undefined}
              value={item.title}
            >
              <Icon aria-hidden="true" />
              <CommandItemContent>
                <CommandItemTitle>{item.title}</CommandItemTitle>
                <CommandItemDescription>
                  {item.description}
                </CommandItemDescription>
              </CommandItemContent>
            </CommandItem>
          );
        })}
      </CommandListbox>
    </Command>
  );
}
