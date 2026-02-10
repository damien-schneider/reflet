import { CaretDown, User } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AssigneeDisplayProps {
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
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  onAssigneeChange: (assigneeId: string) => void;
}

export function AssigneeDisplay({
  isAdmin,
  members,
  assignee,
  onAssigneeChange,
}: AssigneeDisplayProps) {
  if (!(isAdmin && members)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-auto cursor-pointer select-none items-center gap-2 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
        render={<button type="button" />}
      >
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={assignee.image ?? undefined} />
              <AvatarFallback className="text-[8px]">
                {assignee.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">
              {assignee.name ?? assignee.email ?? "Unknown"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Assignee</span>
        )}
        <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup
          onValueChange={onAssigneeChange}
          value={assignee?.id ?? "unassigned"}
        >
          <DropdownMenuRadioItem value="unassigned">
            <User className="h-4 w-4 text-muted-foreground" />
            Unassigned
          </DropdownMenuRadioItem>
          {members.map((member) => (
            <DropdownMenuRadioItem key={member.userId} value={member.userId}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback className="text-[8px]">
                  {member.user?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              {member.user?.name ?? member.user?.email ?? "Unknown"}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
