"use client";

import { IconMessageChatbot } from "@tabler/icons-react";
import { useAtom } from "jotai";

import { Button } from "@/components/ui/button";
import { ceoChatOpenAtom } from "@/store/ui";

export function CeoChatToggle() {
  const [isOpen, setIsOpen] = useAtom(ceoChatOpenAtom);

  return (
    <Button
      aria-label={isOpen ? "Close CEO chat" : "Open CEO chat"}
      className="gap-1.5"
      onClick={() => setIsOpen((prev) => !prev)}
      size="sm"
      variant={isOpen ? "default" : "outline"}
    >
      <IconMessageChatbot className="size-4" />
      <span className="hidden sm:inline">CEO</span>
    </Button>
  );
}
