"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { User } from "@phosphor-icons/react";

export function AssigneeSelect({
  members,
  selectedAssigneeId,
  onAssigneeChange,
}: {
  members: AssigneeTriggerContentProps["members"];
  selectedAssigneeId?: string;
  onAssigneeChange: (assigneeId: string | undefined) => void;
}) {
  return (
    <Select
      onValueChange={(value) =>
        onAssigneeChange(value && value !== "unassigned" ? value : undefined)
      }
      value={selectedAssigneeId || "unassigned"}
    >
      <SelectTrigger
        aria-label="Assignee"
        className="w-auto min-w-36 max-w-52"
        size="sm"
      >
        <SelectValue placeholder="Assignee">
          <AssigneeTriggerContent
            members={members}
            selectedAssigneeId={selectedAssigneeId}
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="flex items-center gap-2 text-muted-foreground">
            <User aria-hidden className="size-4" />
            Unassigned
          </span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            <span className="flex min-w-0 items-center gap-2">
              <MemberAvatar member={member} />
              <span className="truncate">{memberName(member)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface Member {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  userId: string;
}

interface AssigneeTriggerContentProps {
  members: Member[];
  selectedAssigneeId?: string;
}

const memberName = (member: Member) =>
  member.user?.name ?? member.user?.email ?? "Unknown member";

function MemberAvatar({ member }: { member: Member }) {
  return (
    <Avatar className="size-5">
      <AvatarImage alt="" src={member.user?.image ?? undefined} />
      <AvatarFallback className="text-micro">
        {memberName(member).charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function AssigneeTriggerContent({
  members,
  selectedAssigneeId,
}: AssigneeTriggerContentProps) {
  const selected = members.find((m) => m.userId === selectedAssigneeId);
  if (!selected) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <User aria-hidden className="size-4" />
        Assignee
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <MemberAvatar member={selected} />
      <span className="truncate">{memberName(selected)}</span>
    </span>
  );
}
