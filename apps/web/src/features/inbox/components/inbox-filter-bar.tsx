"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ctrl-ui/react/ui/input-group";
import {
  PageActions,
  PageHeader,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Toggle } from "@ctrl-ui/react/ui/toggle";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type React from "react";
import type { RefObject } from "react";
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
      <PageHeader>
        <PageTitle>Inbox</PageTitle>
        <PageActions>{children}</PageActions>
      </PageHeader>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <fieldset
          aria-label="Filter by status"
          className="flex min-w-0 flex-wrap items-center gap-1"
        >
          {CONVERSATION_STATUSES.map((status) => (
            <Toggle
              key={status}
              onPressedChange={() => onToggleStatusFilter(status)}
              pressed={statusFilter.includes(status)}
              showCheck
              value={status}
            >
              {CONVERSATION_STATUS_META[status].label}
            </Toggle>
          ))}
        </fieldset>

        <InputGroup className="w-full sm:ml-auto sm:w-64" size="sm">
          <InputGroupAddon>
            <MagnifyingGlass
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </InputGroupAddon>
          <InputGroupInput
            aria-keyshortcuts="/"
            aria-label="Search conversations"
            autoComplete="off"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            ref={searchInputRef}
            spellCheck={false}
            type="search"
            value={searchQuery}
          />
        </InputGroup>
      </div>
    </div>
  );
}
