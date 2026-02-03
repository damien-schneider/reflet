"use client";

import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { commandPaletteOpenAtom } from "@/store/dashboard-atoms";
import { commandItems } from "../lib/command-items";
import type { CommandItem } from "../lib/types";

interface UseCommandPaletteProps {
  orgSlug?: string;
  isAdmin?: boolean;
}

export function useCommandPalette({
  orgSlug,
  isAdmin = false,
}: UseCommandPaletteProps) {
  const [isOpen, setIsOpen] = useAtom(commandPaletteOpenAtom);
  const router = useRouter();

  const filteredItems = useMemo(() => {
    return commandItems.filter((item) => {
      if (item.requiresOrg && !orgSlug) {
        return false;
      }
      if (item.requiresAdmin && !isAdmin) {
        return false;
      }
      return true;
    });
  }, [orgSlug, isAdmin]);

  const buildHref = useCallback(
    (href: string) => {
      if (!orgSlug) {
        return href;
      }
      return href.replace("$orgSlug", orgSlug);
    },
    [orgSlug]
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      const href = buildHref(item.href);
      router.push(href);
      setIsOpen(false);
    },
    [buildHref, router, setIsOpen]
  );

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
    isOpen,
    setIsOpen,
    filteredItems,
    handleSelect,
    buildHref,
  };
}
