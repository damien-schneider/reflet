import { Badge } from "@/components/ui/badge";
import { type FeedbackStatus, STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: FeedbackStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as FeedbackStatus] ?? {
    label: status,
    variant: "outline" as const,
    className: "",
  };

  return (
    <Badge className={cn(config.className, className)} variant={config.variant}>
      {config.label}
    </Badge>
  );
}
