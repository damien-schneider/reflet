"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  ArrowsClockwise,
  CheckCircle,
  Copy,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { Muted, Text } from "@/components/ui/typography";

const STATUS_CONFIG = {
  active: { color: "green", icon: CheckCircle, label: "Active" },
  error: { color: "red", icon: XCircle, label: "Error" },
  invalid_configuration: {
    color: "red",
    icon: Warning,
    label: "Invalid Configuration",
  },
  pending_verification: {
    color: "yellow",
    icon: ArrowsClockwise,
    label: "Pending Verification",
  },
  removing: {
    color: "neutral",
    icon: ArrowsClockwise,
    label: "Removing...",
  },
} as const;

export function DomainStatusBadge({
  status,
}: {
  status: keyof typeof STATUS_CONFIG;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge color={config.color}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function CopyValueButton({
  onCopy,
  value,
}: {
  onCopy: (text: string) => void;
  value: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={`Copy ${value}`}
            iconOnly
            onClick={() => onCopy(value)}
            size="xs"
            variant="ghost"
          >
            <Copy />
          </Button>
        }
      />
      <TooltipContent>Copy {value}</TooltipContent>
    </Tooltip>
  );
}

export function DnsInstructions({
  domain,
  onCopy,
  verification,
}: {
  domain: string;
  onCopy: (text: string) => void;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
      <Text className="font-medium text-sm">DNS Configuration Required</Text>
      <Muted className="text-sm">
        Add the following DNS record to your domain provider:
      </Muted>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>
              <span className="sr-only">Copy</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                CNAME
              </code>
            </TableCell>
            <TableCell>
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                {domain}
              </code>
            </TableCell>
            <TableCell>
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                cname.vercel-dns.com
              </code>
            </TableCell>
            <TableCell className="text-right">
              <CopyValueButton onCopy={onCopy} value="cname.vercel-dns.com" />
            </TableCell>
          </TableRow>
          {verification?.map((record) => (
            <TableRow key={record.domain}>
              <TableCell>
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  {record.type}
                </code>
              </TableCell>
              <TableCell>
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  {record.domain}
                </code>
              </TableCell>
              <TableCell>
                <code className="break-all rounded bg-background px-1.5 py-0.5 text-xs">
                  {record.value}
                </code>
              </TableCell>
              <TableCell className="text-right">
                <CopyValueButton onCopy={onCopy} value={record.value} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Muted className="text-xs">
        DNS changes can take up to 48 hours to propagate. Click &quot;Check
        Verification&quot; after configuring your DNS records.
      </Muted>
    </div>
  );
}
