"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { CaretDown, UserCircle } from "@phosphor-icons/react";
import { getInitials } from "@/lib/initials";

interface TeamMember {
  email: string;
  id: string;
  image?: string;
  name?: string;
}

interface AssignMemberDropdownProps {
  assignedTo?: string;
  className?: string;
  disabled?: boolean;
  members: TeamMember[];
  onAssign: (memberId: string | undefined) => void;
}

const UNASSIGNED = "unassigned";

function MemberAvatar({ member }: { member: TeamMember }) {
  return (
    <Avatar className="size-5">
      <AvatarImage alt="" src={member.image} />
      <AvatarFallback className="text-micro">
        {getInitials(member.name, member.email)}
      </AvatarFallback>
    </Avatar>
  );
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
        aria-label={`Assignee: ${displayName ?? "Unassigned"}`}
        disabled={disabled}
        render={
          <Button
            className={cn("min-w-0 max-w-56", className)}
            variant="surface"
          />
        }
      >
        {assignedMember ? (
          <MemberAvatar member={assignedMember} />
        ) : (
          <UserCircle aria-hidden />
        )}
        <span className="min-w-0 truncate">{displayName ?? "Unassigned"}</span>
        <CaretDown aria-hidden className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value: string) =>
              onAssign(value === UNASSIGNED ? undefined : value)
            }
            value={assignedTo ?? UNASSIGNED}
          >
            <DropdownMenuRadioItem value={UNASSIGNED}>
              <UserCircle aria-hidden className="text-muted-foreground" />
              Unassigned
            </DropdownMenuRadioItem>

            {members.length > 0 && <DropdownMenuSeparator />}

            {members.map((member) => (
              <DropdownMenuRadioItem key={member.id} value={member.id}>
                <MemberAvatar member={member} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {member.name || member.email}
                  </span>
                  {member.name && (
                    <span className="truncate text-caption text-muted-foreground">
                      {member.email}
                    </span>
                  )}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        {members.length === 0 && (
          <p className="px-2 py-3 text-center text-muted-foreground text-sm">
            No team members
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
