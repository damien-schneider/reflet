"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPalette } from "../hooks/use-command-palette";
import { groupLabels } from "../lib/command-items";
import type { CommandItem as CommandItemType } from "../lib/types";

interface CommandPaletteProps {
  orgSlug?: string;
  isAdmin?: boolean;
}

function filterCommandItems(
  items: CommandItemType[],
  search: string
): CommandItemType[] {
  if (!search) {
    return items;
  }
  const searchLower = search.toLowerCase();
  return items.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(searchLower);
    const keywordMatch = item.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchLower)
    );
    const descriptionMatch = item.description
      ?.toLowerCase()
      .includes(searchLower);
    return labelMatch || keywordMatch || descriptionMatch;
  });
}

export function CommandPalette({ orgSlug, isAdmin }: CommandPaletteProps) {
  const { isOpen, setIsOpen, filteredItems, handleSelect } = useCommandPalette({
    orgSlug,
    isAdmin,
  });

  const groupedItems = filteredItems.reduce<Record<string, CommandItemType[]>>(
    (acc, item) => {
      const group = item.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {}
  );

  return (
    <CommandDialog
      description="Search for pages and settings"
      onOpenChange={setIsOpen}
      open={isOpen}
      title="Command Palette"
    >
      <Command
        filter={(value, search) => {
          const item = filteredItems.find((i) => i.id === value);
          if (!item) {
            return 0;
          }
          const filtered = filterCommandItems([item], search);
          return filtered.length > 0 ? 1 : 0;
        }}
      >
        <CommandInput placeholder="Search pages and settings..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedItems).map(([group, items]) => (
            <CommandGroup heading={groupLabels[group] ?? group} key={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  value={item.id}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                  {item.description ? (
                    <span className="ml-auto text-muted-foreground text-xs">
                      {item.description}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
