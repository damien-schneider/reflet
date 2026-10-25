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

type ColumnKind = "name" | "code" | "text";

interface ReferenceColumn {
  kind: ColumnKind;
  label: string;
}

interface ReferenceRow {
  cells: readonly ReactNode[];
  key: string;
}

interface ReferenceTableProps {
  columns: readonly ReferenceColumn[];
  rows: readonly ReferenceRow[];
}

function ReferenceCell({
  children,
  kind,
}: {
  children: ReactNode;
  kind: ColumnKind;
}) {
  if (kind === "name") {
    return (
      <TableCell className="align-top">
        <Text as="code" mono size="label" tone="foreground">
          {children}
        </Text>
      </TableCell>
    );
  }
  if (kind === "code") {
    return (
      <TableCell className="whitespace-normal align-top">
        <Text
          as="code"
          className="[overflow-wrap:anywhere]"
          mono
          size="label"
          tone="muted"
        >
          {children}
        </Text>
      </TableCell>
    );
  }
  return (
    <TableCell className="min-w-48 whitespace-normal align-top">
      <Text tone="muted">{children}</Text>
    </TableCell>
  );
}

function ReferenceTable({ columns, rows }: ReferenceTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.label}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {columns.map((column, index) => (
                <ReferenceCell key={column.label} kind={column.kind}>
                  {row.cells[index]}
                </ReferenceCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { ReferenceColumn, ReferenceRow };
export { ReferenceTable };
