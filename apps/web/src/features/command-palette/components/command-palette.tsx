"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ctrl-ui/react/ui/command";
import { useCommandPalette } from "../hooks/use-command-palette";
import { groupLabels } from "../lib/command-items";
import type { CommandItem as CommandItemType } from "../lib/types";

interface CommandPaletteProps {
  isAdmin?: boolean;
  orgSlug?: string;
}

function matchesSearch(item: CommandItemType, search: string): boolean {
  const searchLower = search.toLowerCase();
  return [item.label, item.description ?? "", ...item.keywords].some((text) =>
    text.toLowerCase().includes(searchLower)
  );
}

export function CommandPalette({ orgSlug, isAdmin }: CommandPaletteProps) {
  const { isOpen, setIsOpen, filteredItems, handleSelect } = useCommandPalette({
    isAdmin,
    orgSlug,
  });

  const groupedItems = new Map<string, CommandItemType[]>();
  for (const item of filteredItems) {
    const group = groupedItems.get(item.group);
    if (group) {
      group.push(item);
    } else {
      groupedItems.set(item.group, [item]);
    }
  }

  return (
    <CommandDialog
      commandProps={{
        filter: (value, search) => {
          const item = filteredItems.find((i) => i.id === value);
          return item && matchesSearch(item, search) ? 1 : 0;
        },
      }}
      description="Jump to a page or setting"
      onOpenChange={setIsOpen}
      open={isOpen}
      title="Command palette"
    >
      <CommandInput placeholder="Search pages and settings…" />
      <CommandList>
        <CommandEmpty description="Try another word, like “inbox” or “billing”." />
        {[...groupedItems].map(([group, items]) => (
          <CommandGroup heading={groupLabels[group] ?? group} key={group}>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                value={item.id}
              >
                <item.icon aria-hidden="true" className="size-4" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.description ? (
                  <span className="hidden truncate text-muted-foreground text-xs sm:inline">
                    {item.description}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
