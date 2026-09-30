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
            aria-label={
              value ? `Change icon, current ${value}` : "Pick an icon"
            }
            iconOnly
            size="sm"
            variant="surface"
          >
            {value ? (
              <span className="text-base">{value}</span>
            ) : (
              <Smiley
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            )}
          </Button>
        )}
      />
      <PopoverContent align="start" className="w-80" padding="none">
        <div className="flex flex-col">
          {value ? (
            <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
              <span className="text-muted-foreground text-sm">
                Current icon <span className="text-base">{value}</span>
              </span>
              <Button onClick={handleClear} size="xs" variant="ghost">
                Remove icon
              </Button>
            </div>
          ) : null}
          <FrimousseEmojiPicker.Root
            className="h-75"
            onEmojiSelect={(emoji) => handleSelect(emoji.emoji)}
          >
            <FrimousseEmojiPicker.Search
              aria-label="Search emoji"
              className="mx-2 my-2 h-8 w-[calc(100%-16px)] rounded-md border bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
              placeholder="Search emoji…"
            />
            <FrimousseEmojiPicker.Viewport className="h-[calc(300px-48px)] overflow-y-auto px-2 pb-2">
              <FrimousseEmojiPicker.Loading className="flex h-full items-center justify-center text-muted-foreground">
                <Spinner />
              </FrimousseEmojiPicker.Loading>
              <FrimousseEmojiPicker.Empty className="flex h-full items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No emoji match that search</EmptyTitle>
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
                      iconOnly
                      size="sm"
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
