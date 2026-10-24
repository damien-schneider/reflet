"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Plugs } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AccessDate,
  RevocableAccessList,
} from "@/features/account/components/revocable-access-list";
import { SettingsSection } from "@/features/project/components/settings-page";

export function DevtoolsConnectionsSection() {
  const connections = useQuery(api.devtools.tokens.listMine);
  const revoke = useMutation(api.devtools.tokens.revoke);

  return (
    <SettingsSection
      description="Dev servers you connected from the Reflet devtools panel. Each can read and add internal feedback on its organization’s board as you. Connections unused for 30 days expire."
      title="Connected dev servers"
    >
      <RevocableAccessList
        accesses={connections?.map((connection) => ({
          details: (
            <>
              {connection.organizationName} · Last used{" "}
              <AccessDate at={connection.lastUsedAt} />
            </>
          ),
          id: connection._id,
          label: connection.label,
        }))}
        empty={
          <Empty variant="outline">
            <EmptyHeader>
              <EmptyMedia>
                <Plugs aria-hidden className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No dev servers connected</EmptyTitle>
              <EmptyDescription>
                Open the Reflet devtools panel on your dev server and use
                Connect to Reflet in its footer.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
        onRevoke={(tokenId) => revoke({ tokenId })}
      />
    </SettingsSection>
  );
}
