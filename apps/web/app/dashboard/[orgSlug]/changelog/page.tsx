"use client";

import { Code, GearSix, GithubLogo, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Muted, Text } from "@/components/ui/typography";
import { ChangelogWidgetTab } from "@/features/changelog/components/changelog-widget-tab";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseSetupWizard } from "@/features/changelog/components/release-setup-wizard";
import { ReleaseTimeline } from "@/features/changelog/components/release-timeline";

export default function ChangelogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.releases.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const githubStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const apiKeys = useQuery(
    api.feedback_api_admin.getApiKeys,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const deleteRelease = useMutation(api.changelog_actions.remove);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Organization not found</h2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  let githubAction: React.ReactNode = null;
  if (!githubStatus?.isConnected) {
    githubAction = (
      <Button
        onClick={() => {
          window.location.href = `/api/github/install?organizationId=${org._id}&orgSlug=${encodeURIComponent(orgSlug)}`;
        }}
        variant="outline"
      >
        <GithubLogo className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Connect GitHub</span>
        <span className="sm:hidden">GitHub</span>
      </Button>
    );
  } else if (hasConfiguredSync) {
    githubAction = (
      <Link href={`/dashboard/${orgSlug}/settings/releases`}>
        <Button size="sm" variant="ghost">
          <GearSix className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </Link>
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
    <div className="admin-container">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <H1>Changelog</H1>
          <Text variant="bodySmall">
            Manage release notes and product updates
          </Text>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {githubAction}
            <Link href={`/dashboard/${orgSlug}/changelog/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create Release</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {showSetupBanner && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <GithubLogo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-sm">Configure release sync</p>
              <p className="text-muted-foreground text-xs">
                Set up how releases flow between GitHub and Reflet
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowSetupWizard(true)}
            size="sm"
            variant="outline"
          >
            Configure
          </Button>
        </div>
      )}

      <Tabs defaultValue="releases">
        <TabsList>
          <TabsTrigger value="releases">
            <Plus className="mr-2 h-4 w-4" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="widget">
            <Code className="mr-2 h-4 w-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="releases">
          <ReleaseTimeline
            emptyAction={
              isAdmin && (
                <Link href={`/dashboard/${orgSlug}/changelog/new`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Release
                  </Button>
                </Link>
              )
            }
            isAdmin={isAdmin}
            onDelete={setDeletingRelease}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            orgSlug={orgSlug}
            releases={releases ?? []}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="widget">
          <ChangelogWidgetTab
            hasApiKeys={hasApiKeys}
            organizationId={org._id}
            orgSlug={orgSlug}
            primaryColor={org.primaryColor}
            publicKey={publicKey}
          />
        </TabsContent>
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
    </div>
  );
}
