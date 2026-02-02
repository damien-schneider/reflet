"use client";

import { MagnifyingGlass as MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

interface BoardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function BoardHeader({ searchQuery, onSearchChange }: BoardHeaderProps) {
  return (
    <div className="mx-auto mb-6 flex max-w-md justify-center">
      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-full border-0 bg-muted pr-4 pl-11 focus-visible:ring-2"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search feedback..."
          value={searchQuery}
        />
      </div>
    </div>
  );
}
