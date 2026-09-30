"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { CommandListHandle, CommandListProps } from "./command-items";

export function CommandList({
  items,
  command,
  ref,
}: CommandListProps & { ref?: Ref<CommandListHandle> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previousItems, setPreviousItems] = useState(items);
  const menuRef = useRef<HTMLDivElement>(null);

  if (previousItems !== items) {
    setPreviousItems(items);
    setSelectedIndex(0);
  }

  useEffect(() => {
    const menu = menuRef.current;
    const active = menu?.querySelector<HTMLElement>('[data-active="true"]');
    if (!(menu && active)) {
      return;
    }
    const activeBottom = active.offsetTop + active.offsetHeight;
    if (active.offsetTop < menu.scrollTop) {
      menu.scrollTop = active.offsetTop;
    } else if (activeBottom > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = activeBottom - menu.clientHeight;
    }
  }, [selectedIndex]);

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

  return (
    <div
      aria-label="Insert block"
      className="relative max-h-72 w-72 overflow-y-auto p-1"
      data-control-family="popup"
      data-popup-part="surface"
      data-popup-static=""
      data-slot="slash-command-menu"
      ref={menuRef}
      role="group"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            active={selectedIndex === index}
            className="h-auto w-full justify-start py-1.5 text-left"
            key={item.title}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              command(item);
            }}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onMouseMove={() => setSelectedIndex(index)}
            tabIndex={-1}
            variant="ghost"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{item.title}</span>
              <span className="block truncate text-muted-foreground text-xs">
                {item.description}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
