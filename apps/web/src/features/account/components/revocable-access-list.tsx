"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useState } from "react";

const ACCESS_DATE_FORMAT = "MMM d, yyyy";

export interface RevocableAccess<TId extends string> {
  details: ReactNode;
  id: TId;
  label: string;
}

interface RevocableAccessListProps<TId extends string> {
  accesses: RevocableAccess<TId>[] | undefined;
  empty: ReactNode;
  onRevoke: (id: TId) => Promise<unknown>;
}

export function AccessDate({ at }: { at: number }) {
  return (
    <time className="tabular-nums" dateTime={new Date(at).toISOString()}>
      {format(at, ACCESS_DATE_FORMAT)}
    </time>
  );
}

function useRevokeAccess<TId extends string>(
  onRevoke: (id: TId) => Promise<unknown>
) {
  const [pendingId, setPendingId] = useState<TId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revokeAccess = async (id: TId) => {
    setPendingId(id);
    setError(null);
    try {
      await onRevoke(id);
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Couldn’t revoke access. Try again."
      );
    }
    setPendingId(null);
  };

  return { error, pendingId, revokeAccess };
}

export function RevocableAccessList<TId extends string>({
  accesses,
  empty,
  onRevoke,
}: RevocableAccessListProps<TId>) {
  const { error, pendingId, revokeAccess } = useRevokeAccess(onRevoke);

  return (
    <>
      {error ? (
        <p className="text-body text-destructive-text" role="alert">
          {error}
        </p>
      ) : null}

      {accesses === undefined ? (
        <Skeleton className="h-18 w-full rounded-(--radius-panel)" />
      ) : null}

      {accesses?.length === 0 ? empty : null}

      {accesses && accesses.length > 0 ? (
        <ul className="divide-y rounded-(--radius-panel) border">
          {accesses.map((access) => (
            <RevocableAccessRow
              access={access}
              key={access.id}
              onRevoke={revokeAccess}
              pendingId={pendingId}
            />
          ))}
        </ul>
      ) : null}
    </>
  );
}

function RevocableAccessRow<TId extends string>({
  access,
  onRevoke,
  pendingId,
}: {
  access: RevocableAccess<TId>;
  onRevoke: (id: TId) => Promise<void>;
  pendingId: TId | null;
}) {
  const isPending = pendingId === access.id;
  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="truncate text-label" title={access.label}>
          {access.label}
        </p>
        <p className="text-caption text-muted-foreground">{access.details}</p>
      </div>
      <Button
        aria-busy={isPending || undefined}
        aria-label={`Revoke ${access.label}`}
        disabled={pendingId !== null}
        onClick={() => onRevoke(access.id)}
        size="sm"
        tone="danger"
        variant="ghost"
      >
        {isPending ? "Revoking…" : "Revoke"}
      </Button>
    </li>
  );
}
