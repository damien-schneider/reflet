"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  ArrowsClockwise,
  CheckCircle,
  Hourglass,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import {
  type DnsRecord,
  DnsRecordsTable,
} from "@/components/dns-records-table";

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

export function DnsInstructions({
  challengeToken,
  domain,
  verification,
}: {
  challengeToken?: string;
  domain: string;
  verification?: Array<{ domain: string; type: string; value: string }>;
}) {
  const records: DnsRecord[] = [
    { name: domain, type: "CNAME", value: CNAME_TARGET },
    ...(challengeToken
      ? [
          {
            name: `_reflet-challenge.${domain}`,
            type: "TXT",
            value: challengeToken,
          },
        ]
      : []),
    ...(verification ?? []).map(({ domain: name, type, value }) => ({
      name,
      type,
      value,
    })),
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

      <DnsRecordsTable records={records} />

      <p className="text-pretty text-caption text-muted-foreground">
        DNS changes can take up to 48 hours to propagate. Select “Check
        verification” once the records are in place.
      </p>
    </div>
  );
}
