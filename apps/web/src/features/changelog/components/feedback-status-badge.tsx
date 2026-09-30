import { Badge } from "@ctrl-ui/react/ui/badge";
import { type FeedbackStatus, STATUS_CONFIG } from "@/lib/constants";

const isFeedbackStatus = (status: string): status is FeedbackStatus =>
  Object.hasOwn(STATUS_CONFIG, status);

export function FeedbackStatusBadge({ status }: { status: string }) {
  if (!isFeedbackStatus(status)) {
    return (
      <Badge className="shrink-0" size="sm">
        {status}
      </Badge>
    );
  }

  const { color, label, variant } = STATUS_CONFIG[status];
  return (
    <Badge className="shrink-0" color={color} size="sm" variant={variant}>
      {label}
    </Badge>
  );
}
