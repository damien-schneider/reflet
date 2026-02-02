"use client";

import { Smiley } from "@phosphor-icons/react";
import { EmojiPicker as FrimousseEmojiPicker } from "frimousse";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
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
            className="h-8 w-8 p-0"
            size="sm"
            variant="outline"
          >
            {value ? (
              <span className="text-base">{value}</span>
            ) : (
              <Smiley className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      />
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="flex flex-col">
          {value && (
            <button
              className="border-b px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={handleClear}
              type="button"
            >
              Remove icon
            </button>
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
              <FrimousseEmojiPicker.Loading className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading...
              </FrimousseEmojiPicker.Loading>
              <FrimousseEmojiPicker.Empty className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No emoji found.
              </FrimousseEmojiPicker.Empty>
              <FrimousseEmojiPicker.List
                className="select-none"
                components={{
                  CategoryHeader: ({ category }) => (
                    <div className="sticky top-0 bg-popover px-1 py-1.5 text-muted-foreground text-xs">
                      {category.label}
                    </div>
                  ),
                  Emoji: ({ emoji, onClick }) => (
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
                      onClick={onClick}
                      type="button"
                    >
                      {emoji.emoji}
                    </button>
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
