"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  EmojiPickerContent,
  EmojiPicker as EmojiPickerRoot,
  EmojiPickerSearch,
} from "@ctrl-ui/react/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Text } from "@ctrl-ui/react/ui/typography";
import { Smiley } from "@phosphor-icons/react";
import { useState } from "react";

interface EmojiPickerProps {
  onChange: (emoji: string | undefined) => void;
  value?: string;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const choose = (emoji: string | undefined) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={
              value ? `Change icon, current ${value}` : "Pick an icon"
            }
            iconOnly
            size="sm"
            variant="surface"
          />
        }
      >
        {value ? (
          <span className="text-base">{value}</span>
        ) : (
          <Smiley aria-hidden="true" className="text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-fit" padding="none">
        {value ? (
          <PopoverHeader className="flex flex-row items-center justify-between gap-2">
            <Text size="label" tone="muted">
              Current icon <span className="text-base">{value}</span>
            </Text>
            <Button onClick={() => choose(undefined)} size="xs" variant="ghost">
              Remove icon
            </Button>
          </PopoverHeader>
        ) : null}
        <EmojiPickerRoot onEmojiSelect={(emoji) => choose(emoji.emoji)}>
          <EmojiPickerSearch />
          <EmojiPickerContent />
        </EmojiPickerRoot>
      </PopoverContent>
    </Popover>
  );
}
