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
      className="fixed right-6 bottom-6 z-50 size-14 gap-1.5 rounded-full shadow-lg"
      onClick={() => setIsOpen((prev) => !prev)}
      size="icon"
      variant={isOpen ? "default" : "outline"}
    >
      <IconMessageChatbot className="size-5" />
      <span className="sr-only">CEO</span>
    </Button>
  );
}
