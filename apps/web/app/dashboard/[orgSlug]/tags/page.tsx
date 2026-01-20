"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Plus, Tag as TagIcon } from "lucide-react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag-dialog";
import { TagCard } from "@/features/tags/components/tag-card";
import { TagFormDialog } from "@/features/tags/components/tag-form-dialog";

export default function TagsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const tags = useQuery(
    api.tag_manager.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const createTag = useMutation(api.tag_manager_actions.create);
  const updateTag = useMutation(api.tag_manager_actions.update);
  const deleteTag = useMutation(api.tag_manager_actions.remove);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] =
    useState<typeof tags extends Array<infer T> ? T : never | null>(null);
  const [deletingTag, setDeletingTag] =
    useState<typeof tags extends Array<infer T> ? T : never | null>(null);

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

  const handleCreateTag = async (data: {
    name: string;
    color: string;
    isDoneStatus: boolean;
    isRoadmapLane: boolean;
  }) => {
    if (!org?._id) {
      return;
    }
    await createTag({
      organizationId: org._id as Id<"organizations">,
      ...data,
    });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateTag = async (data: {
    name: string;
    color: string;
    isDoneStatus: boolean;
    isRoadmapLane: boolean;
  }) => {
    if (!editingTag) {
      return;
    }
    await updateTag({
      tagId: editingTag._id,
      ...data,
    });
    setEditingTag(null);
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) {
      return;
    }
    await deleteTag({ tagId: deletingTag._id });
    setDeletingTag(null);
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Tags</h1>
          <p className="text-muted-foreground">
            Manage tags to categorize feedback
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Button>
        ) : null}
      </div>

      {tags && tags.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <TagCard
              isAdmin={isAdmin}
              key={tag._id}
              onDelete={() => setDeletingTag(tag)}
              onEdit={() => setEditingTag(tag)}
              tag={tag}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TagIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No tags yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create tags to categorize and organize your feedback.
            </p>
            {isAdmin ? (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Tag
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      <TagFormDialog
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTag}
        open={isCreateDialogOpen}
      />

      {editingTag ? (
        <TagFormDialog
          initialValues={editingTag}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTag(null);
            }
          }}
          onSubmit={handleUpdateTag}
          open={Boolean(editingTag)}
        />
      ) : null}

      {deletingTag ? (
        <DeleteTagDialog
          onConfirm={handleDeleteTag}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingTag(null);
            }
          }}
          open={Boolean(deletingTag)}
          tagName={deletingTag.name}
        />
      ) : null}
    </div>
  );
}
