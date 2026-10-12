"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { AppWindow } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AccessDate,
  RevocableAccessList,
} from "@/features/account/components/revocable-access-list";
import { SettingsSection } from "@/features/project/components/settings-page";

export function TeamToolsSection() {
  const accesses = useQuery(api.team_access.tokens.listMine);
  const revoke = useMutation(api.team_access.tokens.revoke);

  return (
    <SettingsSection
      description="Apps where you signed in to Reflet team tools to record sessions. Each sign-in only works on that app and ends 7 days after you allowed it."
      title="Team tools in your apps"
    >
      <RevocableAccessList
        accesses={accesses?.map((access) => ({
          details: (
            <>
              {access.organizationName} · Signed in{" "}
              <AccessDate at={access.createdAt} /> · Expires{" "}
              <AccessDate at={access.expiresAt} />
            </>
          ),
          id: access._id,
          label: access.origin,
        }))}
        empty={
          <Empty className="rounded-(--radius-panel) border border-dashed">
            <EmptyHeader>
              <EmptyMedia>
                <AppWindow aria-hidden className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No apps signed in</EmptyTitle>
              <EmptyDescription>
                Use Sign in with Reflet in your app’s team tools to record
                sessions there.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
        onRevoke={(tokenId) => revoke({ tokenId })}
      />
    </SettingsSection>
  );
}
