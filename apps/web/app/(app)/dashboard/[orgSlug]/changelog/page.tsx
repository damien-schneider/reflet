"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { Code, GearSix, GithubLogo, Scroll } from "@phosphor-icons/react";
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

export default function ChangelogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === null || org?.role === null) {
    return <OrgNotFound />;
  }

  if (org === undefined) {
    return (
      <PageLayout scroll="page" width="content">
        <PageHeader>
          <PageTitle>Changelog</PageTitle>
        </PageHeader>
        <PageBody>
          <ReleaseTimelineSkeleton />
        </PageBody>
      </PageLayout>
    );
  }

  return <ChangelogContent org={org} orgSlug={orgSlug} />;
}

function ChangelogContent({
  org,
  orgSlug,
}: {
  org: Doc<"organizations">;
  orgSlug: string;
}) {
  const organizationId = org._id;
  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    { organizationId }
  );
  const [activeTab, setActiveTab] = useState("releases");
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const isGithubConnected = Boolean(githubStatus?.isConnected);
  const hasConfiguredSync = Boolean(org.changelogSettings?.syncDirection);

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Changelog</PageTitle>
        {isAdmin && (
          <ChangelogHeaderActions
            github={{
              hasConfiguredSync,
              isConnected: isGithubConnected,
              organizationId,
            }}
            onOpenSettings={() => setActiveTab("settings")}
            orgSlug={orgSlug}
          />
        )}
      </PageHeader>
      <PageBody>
        {isAdmin && isGithubConnected && !hasConfiguredSync && (
          <SetupSyncBanner onSetUp={() => setShowSetupWizard(true)} />
        )}
        <ChangelogTabs
          activeTab={activeTab}
          isAdmin={isAdmin}
          isGithubConnected={isGithubConnected}
          onOpenSetupWizard={() => setShowSetupWizard(true)}
          onTabChange={setActiveTab}
          org={org}
          orgSlug={orgSlug}
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

function ChangelogTabs({
  activeTab,
  isAdmin,
  isGithubConnected,
  onOpenSetupWizard,
  onTabChange,
  org,
  orgSlug,
}: {
  activeTab: string;
  isAdmin: boolean;
  isGithubConnected: boolean;
  onOpenSetupWizard: () => void;
  onTabChange: (value: string) => void;
  org: Doc<"organizations">;
  orgSlug: string;
}) {
  const apiKeys = useQuery(api.feedback.api_admin.getApiKeys, {
    organizationId: org._id,
  });
  const hasApiKeys = apiKeys !== undefined && apiKeys.length > 0;
  const publicKey = apiKeys?.[0]?.publicKey ?? "fb_pub_xxxxxxxxxxxxxxxx";

  return (
    <Tabs onValueChange={onTabChange} value={activeTab}>
      <TabsList>
        <TabsTab value="releases">
          <Scroll aria-hidden="true" className="size-4" />
          Releases
        </TabsTab>
        {isAdmin && (
          <TabsTab value="settings">
            <GearSix aria-hidden="true" className="size-4" />
            Settings
          </TabsTab>
        )}
        <TabsTab value="widget">
          <Code aria-hidden="true" className="size-4" />
          Embed
        </TabsTab>
      </TabsList>

      <TabsPanel className="mt-6" value="releases">
        <ReleasesPanel
          isAdmin={isAdmin}
          isGithubConnected={isGithubConnected}
          organizationId={org._id}
          orgSlug={orgSlug}
        />
      </TabsPanel>

      {isAdmin && (
        <TabsPanel className="mt-6" value="settings">
          <ChangelogSettingsTab
            isAdmin={isAdmin}
            onOpenSetupWizard={onOpenSetupWizard}
            organizationId={org._id}
            orgSlug={orgSlug}
          />
        </TabsPanel>
      )}

      <TabsPanel className="mt-6" value="widget">
        <ChangelogWidgetTab
          hasApiKeys={hasApiKeys}
          organizationId={org._id}
          orgSlug={orgSlug}
          primaryColor={org.primaryColor}
          publicKey={publicKey}
        />
      </TabsPanel>
    </Tabs>
  );
}
