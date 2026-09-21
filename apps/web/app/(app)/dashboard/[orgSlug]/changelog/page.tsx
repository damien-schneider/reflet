"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  PageActions,
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { Code, GearSix, GithubLogo, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import { Muted } from "@/components/ui/typography";
import { ChangelogSettingsTab } from "@/features/changelog/components/changelog-settings-tab";
import { ChangelogWidgetTab } from "@/features/changelog/components/changelog-widget-tab";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseSetupWizard } from "@/features/changelog/components/release-setup-wizard";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";
import { RetroactiveDraftsBar } from "@/features/changelog/components/retroactive-drafts-bar";
import { RetroactiveInlineFlow } from "@/features/changelog/components/retroactive-inline-flow";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { authClient } from "@/lib/auth-client";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: large page component
export default function ChangelogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const { data: session } = authClient.useSession();
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.queries.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const githubStatus = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const apiKeys = useQuery(
    api.feedback.api_admin.getApiKeys,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const deleteRelease = useMutation(
    api.changelog.actions.remove
  ).withOptimisticUpdate((localStore, args) => {
    if (!org) {
      return;
    }
    const current = localStore.getQuery(api.changelog.queries.list, {
      organizationId: org._id,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.list,
      { organizationId: org._id },
      current.filter((r) => r._id !== args.id)
    );
  });

  const publishRelease = useMutation(
    api.changelog.actions.publish
  ).withOptimisticUpdate((localStore, args) => {
    if (!org) {
      return;
    }
    const current = localStore.getQuery(api.changelog.queries.list, {
      organizationId: org._id,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.list,
      { organizationId: org._id },
      current.map((r) =>
        r._id === args.id ? { ...r, publishedAt: Date.now() } : r
      )
    );
  });

  const unpublishRelease = useMutation(
    api.changelog.actions.unpublish
  ).withOptimisticUpdate((localStore, args) => {
    if (!org) {
      return;
    }
    const current = localStore.getQuery(api.changelog.queries.list, {
      organizationId: org._id,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.list,
      { organizationId: org._id },
      current.map((r) =>
        r._id === args.id ? { ...r, publishedAt: undefined } : r
      )
    );
  });

  const [activeTab, setActiveTab] = useState("releases");
  const [deletingRelease, setDeletingRelease] = useState<
    NonNullable<typeof releases>[number] | null
  >(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const hasApiKeys = apiKeys !== undefined && apiKeys.length > 0;
  const publicKey = apiKeys?.[0]?.publicKey ?? "fb_pub_xxxxxxxxxxxxxxxx";

  const hasConfiguredSync = Boolean(org?.changelogSettings?.syncDirection);
  const showSetupBanner =
    isAdmin && githubStatus?.isConnected && !hasConfiguredSync;

  if (!org) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <h2 className="font-semibold text-lg">Organization not found</h2>
              <Muted className="mt-2">
                The organization you&apos;re looking for doesn&apos;t exist.
              </Muted>
            </div>
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  let githubAction: React.ReactNode = null;
  if (!githubStatus?.isConnected) {
    const href = buildGitHubInstallUrl({
      organizationId: org._id,
      orgSlug,
      userId: session?.user?.id,
    });
    githubAction = href ? (
      <Button render={<Link href={href} />} variant="surface">
        <GithubLogo className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Connect GitHub</span>
        <span className="sm:hidden">GitHub</span>
      </Button>
    ) : null;
  } else if (hasConfiguredSync) {
    githubAction = (
      <Button
        onClick={() => setActiveTab("settings")}
        size="xs"
        variant="ghost"
      >
        <GearSix className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
    );
  }

  const handleDeleteRelease = async () => {
    if (!deletingRelease) {
      return;
    }
    await deleteRelease({ id: deletingRelease._id });
    setDeletingRelease(null);
  };

  const handlePublish = async (releaseId: Id<"releases">) => {
    await publishRelease({ id: releaseId });
  };

  const handleUnpublish = async (releaseId: Id<"releases">) => {
    await unpublishRelease({ id: releaseId });
  };

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Changelog</PageTitle>
        {isAdmin && (
          <PageActions>
            {githubAction}
            <Button
              render={<Link href={`/dashboard/${orgSlug}/changelog/new`} />}
              tone="primary"
              variant="solid"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Release</span>
              <span className="sm:hidden">New</span>
            </Button>
          </PageActions>
        )}
      </PageHeader>
      <PageBody>
        {showSetupBanner && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-chart-2/30 bg-chart-2/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <GithubLogo className="h-5 w-5 text-chart-2-text" />
              <div>
                <p className="font-medium text-sm">Configure release sync</p>
                <p className="text-muted-foreground text-xs">
                  Set up how releases flow between GitHub and Reflet
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSetupWizard(true)}
              size="xs"
              variant="surface"
            >
              Configure
            </Button>
          </div>
        )}

        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList>
            <TabsTab value="releases">
              <Plus className="mr-2 h-4 w-4" />
              Releases
            </TabsTab>
            {isAdmin && (
              <TabsTab value="settings">
                <GearSix className="mr-2 h-4 w-4" />
                Settings
              </TabsTab>
            )}
            <TabsTab value="widget">
              <Code className="mr-2 h-4 w-4" />
              Embed
            </TabsTab>
          </TabsList>

          <TabsPanel className="mt-6" value="releases">
            {githubStatus?.isConnected && org && (
              <RetroactiveInlineFlow organizationId={org._id} />
            )}
            {releases && releases.length > 0 && (
              <RetroactiveDraftsBar orgSlug={orgSlug} releases={releases} />
            )}
            <ReleaseTimeline
              isAdmin={isAdmin}
              onDelete={setDeletingRelease}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              orgSlug={orgSlug}
              releases={releases ?? []}
            />
          </TabsPanel>

          {isAdmin && (
            <TabsPanel className="mt-6" value="settings">
              <ChangelogSettingsTab
                isAdmin={isAdmin}
                onOpenSetupWizard={() => setShowSetupWizard(true)}
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

        {deletingRelease && (
          <DeleteReleaseDialog
            onClose={() => setDeletingRelease(null)}
            onConfirm={handleDeleteRelease}
            open={Boolean(deletingRelease)}
          />
        )}

        {githubStatus?.isConnected && (
          <ReleaseSetupWizard
            onOpenChange={setShowSetupWizard}
            open={showSetupWizard}
            organizationId={org._id}
            orgSlug={orgSlug}
          />
        )}
      </PageBody>
    </PageLayout>
  );
}
