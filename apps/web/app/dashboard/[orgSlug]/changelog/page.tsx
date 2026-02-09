"use client";

import { Code, GithubLogo, Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Muted, Text } from "@/components/ui/typography";
import { ChangelogWidgetTab } from "@/features/changelog/components/changelog-widget-tab";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
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
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const githubStatus = useQuery(
    api.github.getConnectionStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const apiKeys = useQuery(
    api.feedback_api_admin.getApiKeys,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const deleteRelease = useMutation(api.changelog_actions.remove);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const [deletingRelease, setDeletingRelease] = useState<
    NonNullable<typeof releases>[number] | null
  >(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  const hasApiKeys = apiKeys !== undefined && apiKeys.length > 0;
  const publicKey = apiKeys?.[0]?.publicKey ?? "fb_pub_xxxxxxxxxxxxxxxx";

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
            {githubStatus?.isConnected ? (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Sync from GitHub</span>
                  <span className="sm:hidden">Sync</span>
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Connect GitHub</span>
                  <span className="sm:hidden">GitHub</span>
                </Button>
              </Link>
            )}
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

      <Tabs defaultValue="releases">
        <TabsList>
          <TabsTrigger value="releases">
            <Plus className="mr-2 h-4 w-4" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="widget">
            <Code className="mr-2 h-4 w-4" />
            Widget
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
            organizationId={org._id as Id<"organizations">}
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
    </div>
  );
}
