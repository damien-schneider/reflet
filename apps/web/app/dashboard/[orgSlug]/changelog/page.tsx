"use client";

import { GithubLogo, Megaphone, Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";
import { AdminReleaseCard } from "@/features/changelog/components/admin-release-card";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseFormDialog } from "@/features/changelog/components/release-form-dialog";

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
  const createRelease = useMutation(api.changelog.create);
  const updateRelease = useMutation(api.changelog.update);
  const deleteRelease = useMutation(api.changelog_actions.remove);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRelease, setEditingRelease] = useState<
    NonNullable<typeof releases>[number] | null
  >(null);
  const [deletingRelease, setDeletingRelease] = useState<
    NonNullable<typeof releases>[number] | null
  >(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  const handleCreateRelease = async (data: {
    title: string;
    version: string;
    content: string;
  }) => {
    if (!org?._id) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createRelease({
        organizationId: org._id as Id<"organizations">,
        title: data.title,
        version: data.version,
        description: data.content,
      });
      setIsCreateDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRelease = async (data: {
    title: string;
    version: string;
    content: string;
  }) => {
    if (!editingRelease) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateRelease({
        id: editingRelease._id,
        title: data.title,
        version: data.version,
        description: data.content,
      });
      setEditingRelease(null);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Changelog</H1>
          <Text variant="bodySmall">
            Manage release notes and product updates
          </Text>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            {githubStatus?.isConnected ? (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  Sync from GitHub
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/${orgSlug}/settings/github`}>
                <Button variant="outline">
                  <GithubLogo className="mr-2 h-4 w-4" />
                  Connect GitHub
                </Button>
              </Link>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Release
            </Button>
          </div>
        ) : null}
      </div>

      {releases && releases.length > 0 ? (
        <div className="space-y-4">
          {releases.map((release) => (
            <AdminReleaseCard
              isAdmin={isAdmin}
              key={release._id}
              onDelete={() => setDeletingRelease(release)}
              onEdit={() => setEditingRelease(release)}
              onPublish={() => handlePublish(release._id)}
              onUnpublish={() => handleUnpublish(release._id)}
              release={release}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <H3 className="mb-2" variant="card">
              No releases yet
            </H3>
            <Muted className="mb-4">
              Create your first release to share product updates.
            </Muted>
            {isAdmin ? (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Release
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      <ReleaseFormDialog
        isSubmitting={isSubmitting}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateRelease}
        open={isCreateDialogOpen}
      />

      {editingRelease ? (
        <ReleaseFormDialog
          isSubmitting={isSubmitting}
          onClose={() => setEditingRelease(null)}
          onSubmit={handleUpdateRelease}
          open={Boolean(editingRelease)}
          release={{
            version: editingRelease.version ?? "",
            title: editingRelease.title,
            content: editingRelease.description ?? "",
          }}
        />
      ) : null}

      {deletingRelease ? (
        <DeleteReleaseDialog
          onClose={() => setDeletingRelease(null)}
          onConfirm={handleDeleteRelease}
          open={Boolean(deletingRelease)}
        />
      ) : null}
    </div>
  );
}
