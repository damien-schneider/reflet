"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import type React from "react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ConversationStatus =
  | "open"
  | "awaiting_reply"
  | "resolved"
  | "closed";

const STATUS_PILLS: { value: ConversationStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "awaiting_reply", label: "Awaiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

interface InboxFilterBarProps {
  children?: React.ReactNode;
  onSearchChange: (query: string) => void;
  onToggleStatusFilter: (status: ConversationStatus) => void;
  searchQuery: string;
  statusFilter: ConversationStatus[];
}

export function InboxFilterBar({
  statusFilter,
  onToggleStatusFilter,
  searchQuery,
  onSearchChange,
  children,
}: InboxFilterBarProps) {
  return (
    <div className="flex items-center gap-3 border-b p-4">
      <ToggleGroup size="sm" variant="outline">
        {STATUS_PILLS.map((pill) => (
          <ToggleGroupItem
            key={pill.value}
            onPressedChange={() => onToggleStatusFilter(pill.value)}
            pressed={statusFilter.includes(pill.value)}
            value={pill.value}
          >
            {pill.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="relative ml-auto w-56">
        <MagnifyingGlass className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          value={searchQuery}
        />
      </div>

      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
