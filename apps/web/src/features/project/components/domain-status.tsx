"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import {
  ArrowsClockwise,
  CheckCircle,
  Hourglass,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { CopyButton } from "@/components/copy-button";

const CNAME_TARGET = "cname.vercel-dns.com";

const STATUS_CONFIG = {
  active: { color: "green", icon: CheckCircle, label: "Active" },
  error: { color: "red", icon: XCircle, label: "Error" },
  invalid_configuration: {
    color: "red",
    icon: Warning,
    label: "Invalid configuration",
  },
  pending_verification: {
    color: "yellow",
    icon: Hourglass,
    label: "Pending verification",
  },
  removing: {
    color: "neutral",
    icon: ArrowsClockwise,
    label: "Removing…",
  },
} as const;

export type DomainStatus = keyof typeof STATUS_CONFIG;

export function DomainStatusBadge({ status }: { status: DomainStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge color={config.color}>
      <Icon aria-hidden />
      {config.label}
    </Badge>
  );
}

interface DnsRecord {
  domain: string;
  type: string;
  value: string;
}

function DnsRecordRow({ record }: { record: DnsRecord }) {
  return (
    <TableRow>
      <TableCell className="font-mono">{record.type}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <code className="break-all font-mono">{record.domain}</code>
          <CopyButton
            label={`Copy name ${record.domain}`}
            size="xs"
            value={record.domain}
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <code className="break-all font-mono">{record.value}</code>
          <CopyButton
            label={`Copy value ${record.value}`}
            size="xs"
            value={record.value}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DnsInstructions({
  challengeToken,
  domain,
  verification,
}: {
  challengeToken?: string;
  domain: string;
  verification?: Array<DnsRecord & { reason?: string }>;
}) {
  const records: DnsRecord[] = [
    { domain, type: "CNAME", value: CNAME_TARGET },
    ...(challengeToken
      ? [
          {
            domain: `_reflet-challenge.${domain}`,
            type: "TXT",
            value: challengeToken,
          },
        ]
      : []),
    ...(verification ?? []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-heading-4">DNS configuration required</h3>
        <p className="text-pretty text-body text-muted-foreground">
          Add {records.length === 1 ? "this record" : "these records"} at your
          DNS provider.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <DnsRecordRow
              key={`${record.type}:${record.domain}:${record.value}`}
              record={record}
            />
          ))}
        </TableBody>
      </Table>

      <p className="text-pretty text-caption text-muted-foreground">
        DNS changes can take up to 48 hours to propagate. Select “Check
        verification” once the records are in place.
      </p>
    </div>
  );
}
