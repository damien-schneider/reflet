import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { getInitials } from "@/lib/initials";

interface UserAvatarProps {
  className?: string;
  user:
    | { name?: string | null; email?: string | null; image?: string | null }
    | null
    | undefined;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage alt="" src={user?.image ?? undefined} />
      <AvatarFallback>
        {getInitials(user?.name ?? undefined, user?.email ?? undefined)}
      </AvatarFallback>
    </Avatar>
  );
}
