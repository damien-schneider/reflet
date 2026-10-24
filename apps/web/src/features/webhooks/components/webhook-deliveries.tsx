import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { Text } from "@ctrl-ui/react/ui/typography";
import {
  CheckCircle,
  Hourglass,
  MinusCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

const DELIVERY_STATUS = {
  failed: { color: "red", icon: XCircle, label: "Failed" },
  pending: { color: "yellow", icon: Hourglass, label: "Pending" },
  skipped: { color: "neutral", icon: MinusCircle, label: "Skipped" },
  success: { color: "green", icon: CheckCircle, label: "Delivered" },
} as const;

export function WebhookDeliveries({
  deliveries,
}: {
  deliveries: Doc<"webhookDeliveries">[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead>Last error</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => {
            const status = DELIVERY_STATUS[delivery.status];
            return (
              <TableRow key={delivery._id}>
                <TableCell>
                  <Text mono size="caption">
                    {delivery.event}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge color={status.color} size="sm">
                    <status.icon aria-hidden />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {delivery.attempts}
                </TableCell>
                <TableCell
                  className="max-w-48 truncate"
                  title={delivery.lastError}
                >
                  <Text tone="muted">{delivery.lastError ?? "None"}</Text>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Text tone="muted">
                    <time dateTime={new Date(delivery.createdAt).toISOString()}>
                      {formatDistanceToNow(delivery.createdAt, {
                        addSuffix: true,
                      })}
                    </time>
                  </Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
