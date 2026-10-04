"use client";

import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  SettingsPage,
  SettingsSection,
} from "@/features/project/components/settings-page";
import { ForwardingCard } from "./forwarding-card";
import { SendingDomainCard } from "./sending-domain-card";
import { SendingPausedAlert } from "./sending-paused-alert";

interface SupportEmailSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function SupportEmailSection({
  isAdmin,
  organizationId,
  orgSlug,
}: SupportEmailSectionProps) {
  const settings = useQuery(
    api.support.email.settings.get,
    isAdmin ? { organizationId } : "skip"
  );

  return (
    <SettingsPage
      description="Receive support email in your inbox and answer customers by email."
      title="Support email"
    >
      {isAdmin ? null : (
        <Card>
          <CardContent>
            <p className="text-body text-muted-foreground">
              Only admins and owners can manage support email.
            </p>
          </CardContent>
        </Card>
      )}
      {isAdmin && settings === undefined ? (
        <Skeleton aria-busy="true" className="h-40" />
      ) : null}
      {settings ? (
        <>
          {settings.sendingPausedAt ? (
            <SendingPausedAlert reason={settings.sendingPauseReason} />
          ) : null}
          <SettingsSection
            description="Forward your support mailbox here. Every email becomes a conversation in your inbox."
            title="Receiving"
          >
            <ForwardingCard
              organizationId={organizationId}
              settings={settings}
            />
          </SettingsSection>
          <SettingsSection
            description="Send replies in full from your own domain. Without it, customers get a link to read your reply."
            title="Sending domain"
          >
            <SendingDomainCard
              domain={settings.domain}
              isPro={settings.isPro}
              organizationId={organizationId}
              orgSlug={orgSlug}
            />
          </SettingsSection>
        </>
      ) : null}
    </SettingsPage>
  );
}
