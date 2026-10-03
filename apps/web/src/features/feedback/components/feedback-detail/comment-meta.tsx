import { cn } from "@ctrl-ui/react/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";

interface CommentAvatarProps {
  image?: string;
  isReply?: boolean;
  name: string;
}

export function CommentAvatar({ image, isReply, name }: CommentAvatarProps) {
  return (
    <Avatar
      className={cn(
        "shrink-0 outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10",
        isReply ? "size-6" : "size-8"
      )}
    >
      <AvatarImage alt="" src={image} />
      <AvatarFallback className="text-xs">
        {name.charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function CommentTimestamp({ createdAt }: { createdAt: number }) {
  const date = new Date(createdAt);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <time
            className="text-muted-foreground text-xs tabular-nums"
            dateTime={date.toISOString()}
          />
        }
      >
        {formatDistanceToNow(date, { addSuffix: true })}
      </TooltipTrigger>
      <TooltipContent>{format(date, "PPP 'at' p")}</TooltipContent>
    </Tooltip>
  );
}
