import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { CaretDown, User } from "@phosphor-icons/react";

interface AssigneeDisplayProps {
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
        aria-label="Change assignee"
        render={
          <Button
            className="h-8 w-auto select-none gap-2 rounded-full border border-input border-dashed px-3 text-sm transition-colors"
            variant="quiet"
          />
        }
      >
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={assignee.image ?? undefined} />
              <AvatarFallback className="text-micro">
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
                <AvatarFallback className="text-micro">
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
