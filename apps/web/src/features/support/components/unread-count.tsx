import { Badge } from "@ctrl-ui/react/ui/badge";

const MAX_DISPLAYED_UNREAD = 99;

export function UnreadCount({ count }: { count: number }) {
  return (
    <Badge className="tabular-nums" color="blue" size="sm">
      {count > MAX_DISPLAYED_UNREAD ? `${MAX_DISPLAYED_UNREAD}+` : count}
      <span className="sr-only"> unread</span>
    </Badge>
  );
}
