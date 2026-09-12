import { Badge } from "@ctrl-ui/react/ui/badge";
import { type FeedbackStatus, STATUS_CONFIG } from "@/lib/constants";

const isFeedbackStatus = (value: string): value is FeedbackStatus =>
  value in STATUS_CONFIG;

interface StatusBadgeProps {
  className?: string;
  status: FeedbackStatus | string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = isFeedbackStatus(status)
    ? STATUS_CONFIG[status]
    : { color: "neutral" as const, label: status, variant: "outline" as const };

  return (
    <Badge className={className} color={config.color} variant={config.variant}>
      {config.label}
    </Badge>
  );
}
