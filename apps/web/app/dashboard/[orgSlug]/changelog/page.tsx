"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Megaphone, Plus } from "lucide-react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const createRelease = useMutation(api.changelog_actions.create);
  const updateRelease = useMutation(api.changelog_actions.update);
  const deleteRelease = useMutation(api.changelog_actions.remove);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<
    (typeof releases extends Array<infer T> ? T : never) | null
  >(null);
  const [deletingRelease, setDeletingRelease] = useState<
    (typeof releases extends Array<infer T> ? T : never) | null
  >(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateRelease = async (data: {
    title: string;
    version?: string;
    description?: string;
  }) => {
    if (!org?._id) {
      return;
    }
    await createRelease({
      organizationId: org._id as Id<"organizations">,
      ...data,
    });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateRelease = async (data: {
    title: string;
    version?: string;
    description?: string;
  }) => {
    if (!editingRelease) {
      return;
    }
    await updateRelease({
      releaseId: editingRelease._id,
      ...data,
    });
    setEditingRelease(null);
  };

  const handleDeleteRelease = async () => {
    if (!deletingRelease) {
      return;
    }
    await deleteRelease({ releaseId: deletingRelease._id });
    setDeletingRelease(null);
  };

  const handlePublish = async (releaseId: Id<"releases">) => {
    await publishRelease({ releaseId });
  };

  const handleUnpublish = async (releaseId: Id<"releases">) => {
    await unpublishRelease({ releaseId });
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Changelog</h1>
          <p className="text-muted-foreground">
            Manage release notes and product updates
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Release
          </Button>
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
            <h3 className="mb-2 font-semibold text-lg">No releases yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first release to share product updates.
            </p>
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
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateRelease}
        open={isCreateDialogOpen}
      />

      {editingRelease ? (
        <ReleaseFormDialog
          initialValues={editingRelease}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRelease(null);
            }
          }}
          onSubmit={handleUpdateRelease}
          open={Boolean(editingRelease)}
        />
      ) : null}

      {deletingRelease ? (
        <DeleteReleaseDialog
          onConfirm={handleDeleteRelease}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingRelease(null);
            }
          }}
          open={Boolean(deletingRelease)}
          releaseTitle={deletingRelease.title}
        />
      ) : null}
    </div>
  );
}
