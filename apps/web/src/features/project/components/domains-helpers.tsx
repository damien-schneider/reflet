import {
  ArrowsClockwise,
  CheckCircle,
  Copy,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Muted, Text } from "@/components/ui/typography";

export const DOMAIN_FORMAT_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const STATUS_CONFIG = {
  pending_verification: {
    label: "Pending Verification",
    variant: "secondary" as const,
    icon: ArrowsClockwise,
  },
  active: {
    label: "Active",
    variant: "default" as const,
    icon: CheckCircle,
  },
  invalid_configuration: {
    label: "Invalid Configuration",
    variant: "destructive" as const,
    icon: Warning,
  },
  removing: {
    label: "Removing...",
    variant: "secondary" as const,
    icon: ArrowsClockwise,
  },
  error: {
    label: "Error",
    variant: "destructive" as const,
    icon: XCircle,
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
    <Badge variant={config.variant}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Type
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Value
              </th>
              <th className="pb-2 text-right font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  CNAME
                </code>
              </td>
              <td className="py-2">
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  {domain}
                </code>
              </td>
              <td className="py-2">
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                  cname.vercel-dns.com
                </code>
              </td>
              <td className="py-2 text-right">
                <Button
                  onClick={() => onCopy("cname.vercel-dns.com")}
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
            {verification?.map((record) => (
              <tr className="border-b" key={record.domain}>
                <td className="py-2">
                  <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                    {record.type}
                  </code>
                </td>
                <td className="py-2">
                  <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                    {record.domain}
                  </code>
                </td>
                <td className="py-2">
                  <code className="break-all rounded bg-background px-1.5 py-0.5 text-xs">
                    {record.value}
                  </code>
                </td>
                <td className="py-2 text-right">
                  <Button
                    onClick={() => onCopy(record.value)}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Muted className="text-xs">
        DNS changes can take up to 48 hours to propagate. Click &quot;Check
        Verification&quot; after configuring your DNS records.
      </Muted>
    </div>
  );
}
