"use client";

import { User } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  userId: string;
  user?: {
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
}

interface Assignee {
  id: string;
  name?: string | null;
  email?: string;
  image?: string | null;
}

interface SidebarAssigneeSectionProps {
  members: Member[] | undefined;
  assignee: Assignee | null | undefined;
  onAssigneeChange: (assigneeId: string | null) => void;
}

export function SidebarAssigneeSection({
  members,
  assignee,
  onAssigneeChange,
}: SidebarAssigneeSectionProps) {
  if (!members) {
    return null;
  }

  return (
    <Select
      onValueChange={onAssigneeChange}
      value={assignee?.id ?? "unassigned"}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Unassigned">
          {assignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignee.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {assignee.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span>{assignee.name || "Unknown"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Unassigned</span>
          </div>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {member.user?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span>
                {member.user?.name || member.user?.email || "Unknown"}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
