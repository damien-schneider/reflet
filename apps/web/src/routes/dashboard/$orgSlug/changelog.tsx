"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminReleaseCard } from "@/features/changelog/components/admin-release-card";
import { DeleteReleaseDialog } from "@/features/changelog/components/delete-release-dialog";
import { ReleaseFormDialog } from "@/features/changelog/components/release-form-dialog";

export const Route = createFileRoute("/dashboard/$orgSlug/changelog")({
  component: ChangelogPage,
});

function ChangelogPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const createRelease = useMutation(api.changelog.create);
  const updateRelease = useMutation(api.changelog.update);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);
  const deleteRelease = useMutation(api.changelog_actions.remove);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRelease, setEditingRelease] = useState<{
    _id: string;
    version: string;
    title: string;
    content: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<string | null>(null);

  const handleCreateRelease = async (data: {
    version: string;
    title: string;
    content: string;
  }) => {
    if (!org?._id) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createRelease({
        organizationId: org._id as Id<"organizations">,
        version: data.version.trim(),
        title: data.title.trim(),
        description: data.content.trim(),
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Failed to create release:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRelease = async (data: {
    version: string;
    title: string;
    content: string;
  }) => {
    if (!editingRelease) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRelease({
        id: editingRelease._id as Id<"releases">,
        version: data.version.trim(),
        title: data.title.trim(),
        description: data.content.trim(),
      });
      setEditingRelease(null);
    } catch (error) {
      console.error("Failed to update release:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (releaseId: string) => {
    try {
      await publishRelease({ id: releaseId as Id<"releases"> });
    } catch (error) {
      console.error("Failed to publish release:", error);
    }
  };

  const handleUnpublish = async (releaseId: string) => {
    try {
      await unpublishRelease({ id: releaseId as Id<"releases"> });
    } catch (error) {
      console.error("Failed to unpublish release:", error);
    }
  };

  const handleDeleteRelease = async () => {
    if (!releaseToDelete) {
      return;
    }
    try {
      await deleteRelease({ id: releaseToDelete as Id<"releases"> });
      setReleaseToDelete(null);
    } catch (error) {
      console.error("Failed to delete release:", error);
    }
  };

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Changelog</h1>
          <p className="text-muted-foreground">
            Manage changelog releases and announcements.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            params={{ orgSlug }}
            rel="noopener"
            target="_blank"
            to="/$orgSlug/changelog"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View public page
          </Link>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Release
            </Button>
          )}
        </div>
      </div>

      {releases && releases.length > 0 ? (
        <div className="space-y-4">
          {releases.map((release) => (
            <AdminReleaseCard
              isAdmin={isAdmin}
              key={release._id}
              onDelete={() => setReleaseToDelete(release._id)}
              onEdit={() =>
                setEditingRelease({
                  _id: release._id,
                  version: release.version ?? "",
                  title: release.title,
                  content: release.description ?? "",
                })
              }
              onPublish={() => handlePublish(release._id)}
              onUnpublish={() => handleUnpublish(release._id)}
              release={release}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="font-semibold text-lg">No releases yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first changelog release.
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Release
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ReleaseFormDialog
        isSubmitting={isSubmitting}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingRelease(null);
        }}
        onSubmit={editingRelease ? handleUpdateRelease : handleCreateRelease}
        open={showCreateDialog || !!editingRelease}
        release={editingRelease || undefined}
      />

      <DeleteReleaseDialog
        onClose={() => setReleaseToDelete(null)}
        onConfirm={handleDeleteRelease}
        open={!!releaseToDelete}
      />
    </div>
  );
}
