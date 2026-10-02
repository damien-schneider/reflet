"use client";

import { Input } from "@ctrl-ui/react/ui/input";
import { InputGroup, InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { TableCell, TableRow } from "@ctrl-ui/react/ui/table";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { format } from "date-fns";

export function AdminDate({ timestamp }: { timestamp: number | undefined }) {
  if (!timestamp) {
    return (
      <>
        <span aria-hidden>—</span>
        <span className="sr-only">Unknown</span>
      </>
    );
  }
  return (
    <time className="tabular-nums" dateTime={new Date(timestamp).toISOString()}>
      {format(timestamp, "PP")}
    </time>
  );
}

export function SuperAdminTableSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="space-y-4">
      <p className="sr-only" role="status">
        {label}
      </p>
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-100 rounded-(--radius-panel)" />
    </div>
  );
}

interface SuperAdminFilterProps {
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function SuperAdminFilter({
  label,
  onChange,
  value,
}: SuperAdminFilterProps) {
  return (
    <InputGroup className="w-72 max-w-full">
      <InputGroupAddon>
        <MagnifyingGlass aria-hidden />
      </InputGroupAddon>
      <Input
        aria-label={label}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${label}…`}
        spellCheck={false}
        type="search"
        value={value}
      />
    </InputGroup>
  );
}

interface EmptyTableRowProps {
  colSpan: number;
  message: string;
}

export function EmptyTableRow({ colSpan, message }: EmptyTableRowProps) {
  return (
    <TableRow>
      <TableCell
        className="h-24 text-center text-muted-foreground"
        colSpan={colSpan}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
