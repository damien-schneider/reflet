"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@ctrl-ui/react/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Smiley } from "@phosphor-icons/react";
import { EmojiPicker as FrimousseEmojiPicker } from "frimousse";
import { useState } from "react";

interface EmojiPickerProps {
  onChange: (emoji: string | undefined) => void;
  value?: string;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={(props) => (
          <Button
            {...props}
            aria-label={value ? "Change icon" : "Pick an icon"}
            className="size-8 p-0"
            iconOnly
            size="xs"
            variant="surface"
          >
            {value ? (
              <span className="text-base">{value}</span>
            ) : (
              <Smiley className="size-4 text-muted-foreground" />
            )}
          </Button>
        )}
      />
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="flex flex-col">
          {value && (
            <Button
              className="h-auto w-full justify-start rounded-none border-b px-3 py-2 text-left text-sm"
              onClick={handleClear}
              variant="ghost"
            >
              Remove icon
            </Button>
          )}
          <FrimousseEmojiPicker.Root
            className="h-[300px]"
            onEmojiSelect={(emoji) => handleSelect(emoji.emoji)}
          >
            <FrimousseEmojiPicker.Search
              className="mx-2 my-2 h-8 w-[calc(100%-16px)] rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search emoji..."
            />
            <FrimousseEmojiPicker.Viewport className="h-[calc(300px-48px)] overflow-y-auto px-2 pb-2">
              <FrimousseEmojiPicker.Loading className="flex h-full items-center justify-center text-muted-foreground">
                <Spinner />
              </FrimousseEmojiPicker.Loading>
              <FrimousseEmojiPicker.Empty className="flex h-full items-center justify-center">
                <Empty className="p-0">
                  <EmptyHeader>
                    <EmptyTitle>No emoji found</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </FrimousseEmojiPicker.Empty>
              <FrimousseEmojiPicker.List
                className="select-none"
                components={{
                  CategoryHeader: ({ category }) => (
                    <div className="sticky top-0 bg-popover px-1 py-1.5 text-muted-foreground text-xs">
                      {category.label}
                    </div>
                  ),
                  Emoji: ({ emoji, ...emojiProps }) => (
                    <Button
                      {...emojiProps}
                      aria-label={emoji.label}
                      className="size-8 p-0"
                      iconOnly
                      size="xs"
                      variant="ghost"
                    >
                      {emoji.emoji}
                    </Button>
                  ),
                }}
              />
            </FrimousseEmojiPicker.Viewport>
          </FrimousseEmojiPicker.Root>
        </div>
      </PopoverContent>
    </Popover>
  );
}
