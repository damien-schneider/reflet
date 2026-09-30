"use client";

import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { commandPaletteOpenAtom } from "@/store/dashboard-atoms";
import { commandItems } from "../lib/command-items";
import type { CommandItem } from "../lib/types";

interface UseCommandPaletteProps {
  isAdmin?: boolean;
  orgSlug?: string;
}

export function useCommandPalette({
  orgSlug,
  isAdmin = false,
}: UseCommandPaletteProps) {
  const [isOpen, setIsOpen] = useAtom(commandPaletteOpenAtom);
  const router = useRouter();

  const filteredItems = commandItems.filter((item) => {
    if (item.requiresOrg && !orgSlug) {
      return false;
    }
    if (item.requiresAdmin && !isAdmin) {
      return false;
    }
    return true;
  });

  const buildHref = (href: string) =>
    orgSlug ? href.replace("$orgSlug", orgSlug) : href;

  const handleSelect = (item: CommandItem) => {
    router.push(buildHref(item.href));
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  return {
    buildHref,
    filteredItems,
    handleSelect,
    isOpen,
    setIsOpen,
  };
}
