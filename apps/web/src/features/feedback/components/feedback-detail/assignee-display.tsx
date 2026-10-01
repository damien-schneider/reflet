import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { CaretDown, User } from "@phosphor-icons/react";
import { TagBadge } from "@/components/tag-badge";

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
        aria-label={
          assignee
            ? `Assignee: ${assignee.name ?? assignee.email ?? "Unknown"}. Change assignee`
            : "Set assignee"
        }
        className="max-w-full select-none"
        render={
          <TagBadge render={<button type="button" />} variant="outline" />
        }
      >
        {assignee ? (
          <>
            <Avatar className="size-3.5">
              <AvatarImage src={assignee.image ?? undefined} />
              <AvatarFallback className="text-micro">
                {assignee.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span
              className="truncate"
              title={assignee.name ?? assignee.email ?? undefined}
            >
              {assignee.name ?? assignee.email ?? "Unknown"}
            </span>
          </>
        ) : (
          <span>Assignee</span>
        )}
        <CaretDown aria-hidden />
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
