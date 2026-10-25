import { cn } from "@ctrl-ui/react/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Text } from "@ctrl-ui/react/ui/typography";
import { format, formatDistanceToNow } from "date-fns";

interface CommentAvatarProps {
  image?: string;
  isReply?: boolean;
  name: string;
}

export function CommentAvatar({ image, isReply, name }: CommentAvatarProps) {
  return (
    <Avatar className={cn("shrink-0", isReply ? "size-6" : "size-8")}>
      <AvatarImage alt="" src={image} />
      <AvatarFallback>{name.charAt(0).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}

export function CommentTimestamp({ createdAt }: { createdAt: number }) {
  const date = new Date(createdAt);
  return (
    <Tooltip>
      <TooltipTrigger render={<time dateTime={date.toISOString()} />}>
        <Text as="span" numeric size="caption" tone="muted">
          {formatDistanceToNow(date, { addSuffix: true })}
        </Text>
      </TooltipTrigger>
      <TooltipContent>{format(date, "PPP 'at' p")}</TooltipContent>
    </Tooltip>
  );
}
