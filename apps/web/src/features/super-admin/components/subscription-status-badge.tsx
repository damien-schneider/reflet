import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";

const SUBSCRIPTION_STATUS: Record<
  string,
  { color: BadgeProps["color"]; label: string }
> = {
  active: { color: "blue", label: "Active" },
  canceled: { color: "neutral", label: "Canceled" },
  incomplete: { color: "orange", label: "Incomplete" },
  incomplete_expired: { color: "neutral", label: "Checkout expired" },
  none: { color: "neutral", label: "None" },
  past_due: { color: "orange", label: "Past due" },
  paused: { color: "neutral", label: "Paused" },
  trialing: { color: "purple", label: "Trialing" },
  unpaid: { color: "red", label: "Unpaid" },
};

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const meta = SUBSCRIPTION_STATUS[status] ?? {
    color: "neutral",
    label: status,
  };
  return <Badge color={meta.color}>{meta.label}</Badge>;
}
