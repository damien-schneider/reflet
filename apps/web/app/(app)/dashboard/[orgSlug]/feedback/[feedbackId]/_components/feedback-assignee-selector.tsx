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

export interface FeedbackAssigneeSelectorProps {
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  isAdmin: boolean;
  members:
    | Array<{
        userId: string;
        user?: {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        } | null;
      }>
    | undefined;
  onAssigneeChange: (assigneeId: string) => void;
}

export function FeedbackAssigneeSelector({
  isAdmin,
  members,
  assignee,
  onAssigneeChange,
}: FeedbackAssigneeSelectorProps) {
  if (isAdmin && members) {
    return (
      <Select
        onValueChange={(value) => {
          if (value) {
            onAssigneeChange(value);
          }
        }}
        value={assignee?.id ?? "unassigned"}
      >
        <SelectTrigger className="h-7 w-auto min-w-36 gap-2 border-dashed text-sm">
          <SelectValue placeholder="Assignee">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={assignee.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {assignee.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{assignee.name ?? assignee.email ?? "Unknown"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Assignee</span>
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
                  <AvatarFallback className="text-[8px]">
                    {member.user?.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {member.user?.name ?? member.user?.email ?? "Unknown"}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (!assignee) {
    return null;
  }

  return (
    <span className="flex items-center gap-1.5">
      <Avatar className="h-4 w-4">
        <AvatarImage src={assignee.image ?? undefined} />
        <AvatarFallback className="text-[8px]">
          {assignee.name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      {assignee.name ?? "Assigned"}
    </span>
  );
}
