import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { Text } from "@ctrl-ui/react/ui/typography";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";

export interface DnsRecord {
  name: string;
  priority?: number;
  status?: ReactNode;
  type: string;
  value: string;
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <code className="break-all font-mono">{value}</code>
      <CopyButton label={`Copy ${label} ${value}`} size="xs" value={value} />
    </div>
  );
}

export function DnsRecordsTable({ records }: { records: DnsRecord[] }) {
  const hasPriority = records.some((record) => record.priority !== undefined);
  const hasStatus = records.some((record) => record.status !== undefined);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
          {hasPriority ? <TableHead>Priority</TableHead> : null}
          {hasStatus ? <TableHead>Status</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={`${record.type}:${record.name}:${record.value}`}>
            <TableCell>
              <Text mono>{record.type}</Text>
            </TableCell>
            <TableCell>
              <CopyableValue label="name" value={record.name} />
            </TableCell>
            <TableCell>
              <CopyableValue label="value" value={record.value} />
            </TableCell>
            {hasPriority ? (
              <TableCell>
                <Text mono>{record.priority}</Text>
              </TableCell>
            ) : null}
            {hasStatus ? <TableCell>{record.status}</TableCell> : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
