"use client";

import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { PublicOrgNotFound } from "@/features/public-org/components/public-org-states";
import { SupportDesk } from "@/features/support/components/desk/support-desk";
import { SupportLoadingState } from "@/features/support/components/support-loading-state";
import { SupportUnavailable } from "@/features/support/components/support-unavailable";
import { authClient } from "@/lib/auth-client";

interface SupportCenterProps {
  backHref: string;
  org: { _id: Id<"organizations">; slug: string } | null | undefined;
}

export function SupportCenter({ backHref, org }: SupportCenterProps) {
  const { data: session } = authClient.useSession();
  const supportSettings = useQuery(
    api.support.settings.get,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (org === undefined || supportSettings === undefined) {
    return <SupportLoadingState />;
  }

  if (org === null) {
    return (
      <PublicOrgNotFound
        description="Check the link, or ask the team that shared it for the right address."
        homeHref="/"
        homeLabel="Go to homepage"
        title="Organization not found"
      />
    );
  }

  if (!supportSettings?.supportEnabled) {
    return <SupportUnavailable backHref={backHref} />;
  }

  return (
    <PageLayout scroll="page" width="prose">
      <PageHeader>
        <PageTitle>Contact support</PageTitle>
        <PageDescription>
          Send a message. Replies from the team show up on this page.
        </PageDescription>
      </PageHeader>
      <PageBody>
        <SupportDesk isGuest={!session?.user} org={org} surface="page" />
      </PageBody>
    </PageLayout>
  );
}
