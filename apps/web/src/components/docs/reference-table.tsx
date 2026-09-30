import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * name: identifier, never wraps. code: literal values or types, may wrap.
 * text: prose.
 */
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

const CELL_CLASS: Record<ColumnKind, string> = {
  code: "whitespace-normal font-mono text-label text-muted-foreground [overflow-wrap:anywhere]",
  name: "font-mono text-foreground text-label",
  text: "min-w-48 whitespace-normal text-muted-foreground",
};

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
              {columns.map((column, index) => {
                const cell = row.cells[index];
                return (
                  <TableCell
                    className={cn("align-top", CELL_CLASS[column.kind])}
                    key={column.label}
                  >
                    {column.kind !== "text" && typeof cell === "string" ? (
                      <code>{cell}</code>
                    ) : (
                      cell
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { ReferenceColumn, ReferenceRow };
export { ReferenceTable };
