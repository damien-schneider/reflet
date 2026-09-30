"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Plugs } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import { SettingsSection } from "@/features/project/components/settings-page";

const LAST_USED_DATE_FORMAT = "MMM d, yyyy";

export function DevtoolsConnectionsSection() {
  const connections = useQuery(api.devtools.tokens.listMine);
  const revoke = useMutation(api.devtools.tokens.revoke);
  const [pendingToken, setPendingToken] = useState<Id<"devtoolsTokens"> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const revokeConnection = async (tokenId: Id<"devtoolsTokens">) => {
    setPendingToken(tokenId);
    setError(null);
    try {
      await revoke({ tokenId });
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Couldn’t revoke the connection. Try again."
      );
    }
    setPendingToken(null);
  };

  return (
    <SettingsSection
      description="Dev servers you connected from the Reflet devtools Board tab. Each can read and add internal feedback on its organization’s board as you. Connections unused for 30 days expire."
      title="Connected dev servers"
    >
      {error ? (
        <p className="text-body text-destructive-text" role="alert">
          {error}
        </p>
      ) : null}

      {connections === undefined ? (
        <Skeleton className="h-18 w-full rounded-(--radius-panel)" />
      ) : null}

      {connections?.length === 0 ? (
        <Empty className="rounded-(--radius-panel) border border-dashed">
          <EmptyHeader>
            <EmptyMedia>
              <Plugs aria-hidden className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No dev servers connected</EmptyTitle>
            <EmptyDescription>
              Open the Board tab in Reflet devtools on your dev server to
              connect it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {connections && connections.length > 0 ? (
        <ul className="divide-y rounded-(--radius-panel) border">
          {connections.map((connection) => {
            const isPending = pendingToken === connection._id;
            return (
              <li
                className="flex items-center justify-between gap-4 p-4"
                key={connection._id}
              >
                <div className="min-w-0">
                  <p className="truncate text-label" title={connection.label}>
                    {connection.label}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {connection.organizationName} · Last used{" "}
                    <time
                      className="tabular-nums"
                      dateTime={new Date(connection.lastUsedAt).toISOString()}
                    >
                      {format(connection.lastUsedAt, LAST_USED_DATE_FORMAT)}
                    </time>
                  </p>
                </div>
                <Button
                  aria-busy={isPending || undefined}
                  aria-label={`Revoke ${connection.label}`}
                  disabled={pendingToken !== null}
                  onClick={() => revokeConnection(connection._id)}
                  size="sm"
                  tone="danger"
                  variant="ghost"
                >
                  {isPending ? "Revoking…" : "Revoke"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SettingsSection>
  );
}
