"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { GithubLogo } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use, useState } from "react";
import { ChangelogSettingsTab } from "@/features/changelog/components/changelog-settings-tab";
import { ChangelogWidgetTab } from "@/features/changelog/components/changelog-widget-tab";
import { ReleaseSetupWizard } from "@/features/changelog/components/release-setup-wizard";
import { ReleaseTimelineSkeleton } from "@/features/changelog/components/release-timeline";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { ChangelogHeaderActions } from "./changelog-header-actions";
import { ReleasesPanel } from "./releases-panel";

const VIEW_TITLES = {
  releases: "Changelog",
  settings: "Changelog settings",
  widget: "Embed changelog",
} as const;

type ChangelogTab = keyof typeof VIEW_TITLES;

const isChangelogView = (value: string | undefined): value is ChangelogTab =>
  value !== undefined && value in VIEW_TITLES;

export default function ChangelogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug } = use(params);
  const { tab } = use(searchParams);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === null || org?.role === null) {
    return <OrgNotFound />;
  }

  if (org === undefined) {
    return (
      <PageLayout width="content">
        <PageHeader>
          <PageTitle>Changelog</PageTitle>
        </PageHeader>
        <PageBody>
          <ReleaseTimelineSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <ChangelogContent
      org={org}
      orgSlug={orgSlug}
      view={isChangelogView(tab) ? tab : "releases"}
    />
  );
}

function ChangelogContent({
  org,
  orgSlug,
  view,
}: {
  org: Doc<"organizations">;
  orgSlug: string;
  view: ChangelogTab;
}) {
  const organizationId = org._id;
  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const isGithubConnected = Boolean(githubStatus?.isConnected);
  const hasConfiguredReleases =
    org.changelogSettings?.targetBranch !== undefined;

  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>{VIEW_TITLES[view]}</PageTitle>
        {isAdmin && view === "releases" && (
          <ChangelogHeaderActions
            github={{ isConnected: isGithubConnected, organizationId }}
            orgSlug={orgSlug}
          />
        )}
      </PageHeader>
      <PageBody>
        {isAdmin && isGithubConnected && !hasConfiguredReleases && (
          <SetupSyncBanner onSetUp={() => setShowSetupWizard(true)} />
        )}
        <ChangelogView
          isAdmin={isAdmin}
          isGithubConnected={isGithubConnected}
          onOpenSetupWizard={() => setShowSetupWizard(true)}
          org={org}
          orgSlug={orgSlug}
          view={view}
        />
        {isGithubConnected && (
          <ReleaseSetupWizard
            onOpenChange={setShowSetupWizard}
            open={showSetupWizard}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        )}
      </PageBody>
    </PageLayout>
  );
}

function SetupSyncBanner({ onSetUp }: { onSetUp: () => void }) {
  return (
    <Alert className="mb-6">
      <GithubLogo aria-hidden="true" />
      <AlertTitle>Set up release sync</AlertTitle>
      <AlertDescription>
        <p>Choose how releases move between GitHub and Reflet.</p>
        <Button
          className="mt-2 w-fit"
          onClick={onSetUp}
          size="xs"
          variant="surface"
        >
          Set up sync
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ChangelogView({
  isAdmin,
  isGithubConnected,
  onOpenSetupWizard,
  org,
  orgSlug,
  view,
}: {
  isAdmin: boolean;
  isGithubConnected: boolean;
  onOpenSetupWizard: () => void;
  org: Doc<"organizations">;
  orgSlug: string;
  view: ChangelogTab;
}) {
  const apiKeys = useQuery(api.feedback.api_admin.getApiKeys, {
    organizationId: org._id,
  });
  const hasApiKeys = apiKeys !== undefined && apiKeys.length > 0;
  const publicKey = apiKeys?.[0]?.publicKey ?? "fb_pub_xxxxxxxxxxxxxxxx";

  if (view === "settings" && isAdmin) {
    return (
      <ChangelogSettingsTab
        isAdmin={isAdmin}
        onOpenSetupWizard={onOpenSetupWizard}
        organizationId={org._id}
        orgSlug={orgSlug}
      />
    );
  }
  if (view === "widget") {
    return (
      <ChangelogWidgetTab
        hasApiKeys={hasApiKeys}
        organizationId={org._id}
        orgSlug={orgSlug}
        primaryColor={org.primaryColor}
        publicKey={publicKey}
      />
    );
  }
  return (
    <ReleasesPanel
      isAdmin={isAdmin}
      isGithubConnected={isGithubConnected}
      organizationId={org._id}
      orgSlug={orgSlug}
    />
  );
}
