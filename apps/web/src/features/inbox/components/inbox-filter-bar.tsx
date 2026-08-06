"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import type React from "react";
import type { RefObject } from "react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { H1 } from "@/components/ui/typography";
import {
  CONVERSATION_STATUS_META,
  CONVERSATION_STATUSES,
  type ConversationStatus,
} from "@/features/support/lib/conversation-status";

interface InboxFilterBarProps {
  children?: React.ReactNode;
  onSearchChange: (query: string) => void;
  onToggleStatusFilter: (status: ConversationStatus) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  statusFilter: ConversationStatus[];
}

export function InboxFilterBar({
  statusFilter,
  onToggleStatusFilter,
  searchQuery,
  onSearchChange,
  searchInputRef,
  children,
}: InboxFilterBarProps) {
  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        <H1 variant="page">Inbox</H1>
        <div className="flex items-center gap-2">{children}</div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ToggleGroup
          className="max-w-full overflow-x-auto"
          size="sm"
          variant="outline"
        >
          {CONVERSATION_STATUSES.map((status) => (
            <ToggleGroupItem
              key={status}
              onPressedChange={() => onToggleStatusFilter(status)}
              pressed={statusFilter.includes(status)}
              value={status}
            >
              {CONVERSATION_STATUS_META[status].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="relative w-full sm:ml-auto sm:w-56">
          <MagnifyingGlass className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search conversations"
            className="h-8 pl-8 text-sm"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            ref={searchInputRef}
            value={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}
