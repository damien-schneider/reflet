"use client";

import { CheckCircle, Gear, XCircle } from "@phosphor-icons/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

interface InboxCommandPaletteProps {
  hasSelectedConversation: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onResolve: () => void;
  onToggleSupport: () => void;
  open: boolean;
  supportEnabled: boolean;
}

export function InboxCommandPalette({
  open,
  onOpenChange,
  onResolve,
  onClose,
  onToggleSupport,
  hasSelectedConversation,
  supportEnabled,
}: InboxCommandPaletteProps) {
  const runAndClose = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      description="Search for actions"
      onOpenChange={onOpenChange}
      open={open}
      title="Inbox Commands"
    >
      <Command>
        <CommandInput placeholder="Type a command..." />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>

          {hasSelectedConversation && (
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => runAndClose(onResolve)}>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Resolve conversation
                <CommandShortcut>E</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(onClose)}>
                <XCircle className="h-4 w-4 text-zinc-500" />
                Close conversation
                <CommandShortcut>C</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runAndClose(onToggleSupport)}>
              <Gear className="h-4 w-4" />
              {supportEnabled
                ? "Disable public support page"
                : "Enable public support page"}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
