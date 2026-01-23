"use client";

import { CaretDown, User, UserCircle } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  image?: string;
}

interface AssignMemberDropdownProps {
  members: TeamMember[];
  assignedTo?: string;
  onAssign: (memberId: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const INITIALS_SPLIT_PATTERN = /[\s@]/;

function getInitials(name?: string, email?: string): string {
  const source = name || email || "?";
  return source
    .split(INITIALS_SPLIT_PATTERN)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AssignMemberDropdown({
  members,
  assignedTo,
  onAssign,
  disabled = false,
  className,
}: AssignMemberDropdownProps) {
  const assignedMember = members.find((m) => m.id === assignedTo);
  const displayName = assignedMember?.name || assignedMember?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            className={cn("justify-between gap-2", className)}
            variant="outline"
          />
        }
      >
        {assignedMember ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={assignedMember.image} />
              <AvatarFallback className="text-[10px]">
                {getInitials(assignedMember.name, assignedMember.email)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{displayName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCircle className="h-4 w-4" />
            <span className="text-sm">Unassigned</span>
          </div>
        )}
        <CaretDown className="h-3 w-3 shrink-0 opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={cn(!assignedTo && "bg-accent")}
          onClick={() => onAssign(undefined)}
        >
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <span>Unassigned</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {members.map((member) => {
          const isSelected = assignedTo === member.id;
          const memberName = member.name || member.email;

          return (
            <DropdownMenuItem
              className={cn(isSelected && "bg-accent")}
              key={member.id}
              onClick={() => onAssign(member.id)}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.image} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(member.name, member.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm">{memberName}</span>
                {member.name && (
                  <span className="text-muted-foreground text-xs">
                    {member.email}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}

        {members.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-center text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="text-sm">No team members</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
