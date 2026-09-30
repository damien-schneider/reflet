"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@ctrl-ui/react/ui/command";
import { CheckCircle, Gear, XCircle } from "@phosphor-icons/react";

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
      description="Run an inbox action"
      onOpenChange={onOpenChange}
      open={open}
      title="Inbox commands"
    >
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No matching commands</CommandEmpty>

        {hasSelectedConversation && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runAndClose(onResolve)}>
              <CheckCircle className="h-4 w-4 text-success-text" />
              Resolve conversation
              <CommandShortcut>E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runAndClose(onClose)}>
              <XCircle className="h-4 w-4 text-muted-foreground" />
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
    </CommandDialog>
  );
}
