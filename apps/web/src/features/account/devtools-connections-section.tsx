"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { H3, Muted } from "@/components/ui/typography";

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
          : "Failed to disconnect. Try again."
      );
    }
    setPendingToken(null);
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <H3 variant="section">Connected dev servers</H3>
        <Muted>
          Dev servers you connected from the Reflet devtools Board tab. Each can
          read and add internal feedback on its organization's board as you.
          Connections unused for 30 days expire.
        </Muted>
      </div>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {connections === undefined && <Spinner className="h-6 w-6" />}

      {connections?.length === 0 && <Muted>No dev servers connected.</Muted>}

      {connections?.map((connection) => (
        <div
          className="flex items-center justify-between gap-4 rounded-lg border p-4"
          key={connection._id}
        >
          <div className="min-w-0">
            <h4 className="truncate font-medium">{connection.label}</h4>
            <p className="text-muted-foreground text-sm">
              {connection.organizationName} · Last used{" "}
              {new Date(connection.lastUsedAt).toISOString().slice(0, 10)}
            </p>
          </div>
          <Button
            aria-busy={pendingToken === connection._id}
            aria-label={`Revoke ${connection.label}`}
            disabled={pendingToken !== null}
            iconOnly
            onClick={() => revokeConnection(connection._id)}
            variant="ghost"
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </section>
  );
}
