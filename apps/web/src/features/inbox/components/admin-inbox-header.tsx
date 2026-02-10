"use client";

import { Funnel } from "@phosphor-icons/react";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { H1, Muted } from "@/components/ui/typography";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

const STATUS_OPTIONS: { value: ConversationStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

interface AdminInboxHeaderProps {
  statusFilter: ConversationStatus[];
  onToggleStatusFilter: (status: ConversationStatus) => void;
  children?: React.ReactNode;
}

export function AdminInboxHeader({
  statusFilter,
  onToggleStatusFilter,
  children,
}: AdminInboxHeaderProps) {
  return (
    <div className="border-b p-6">
      <div className="flex items-center justify-between">
        <div>
          <H1 variant="page">Inbox</H1>
          <Muted>Manage support conversations from your users</Muted>
        </div>

        <div className="flex items-center gap-2">
          {children}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button {...props} variant="outline">
                  <Funnel className="mr-2 h-4 w-4" />
                  Filter
                  {statusFilter.length > 0 && (
                    <span className="ml-2 rounded-full bg-olive-500 px-2 py-0.5 text-white text-xs">
                      {statusFilter.length}
                    </span>
                  )}
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes(option.value)}
                    key={option.value}
                    onCheckedChange={() => onToggleStatusFilter(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
