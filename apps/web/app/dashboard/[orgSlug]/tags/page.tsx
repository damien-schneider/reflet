"use client";

import { Plus, Tag as TagIcon } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";
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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<
    NonNullable<typeof tags>[number] | null
  >(null);
  const [deletingTag, setDeletingTag] = useState<
    NonNullable<typeof tags>[number] | null
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

  return (
    <div className="admin-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>Tags</H1>
          <Text variant="bodySmall">Manage tags to categorize feedback</Text>
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
            <H3 className="mb-2" variant="card">
              No tags yet
            </H3>
            <Muted className="mb-4">
              Create tags to categorize and organize your feedback.
            </Muted>
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
        editingTag={null}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => setIsCreateDialogOpen(false)}
        open={isCreateDialogOpen}
        organizationId={org._id as Id<"organizations">}
      />

      {editingTag ? (
        <TagFormDialog
          editingTag={{
            _id: editingTag._id,
            name: editingTag.name,
            color: editingTag.color,
            isDoneStatus: editingTag.isDoneStatus,
            isRoadmapLane: editingTag.isRoadmapLane,
          }}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTag(null);
            }
          }}
          onSuccess={() => setEditingTag(null)}
          open={Boolean(editingTag)}
          organizationId={org._id as Id<"organizations">}
        />
      ) : null}

      {deletingTag ? (
        <DeleteTagDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeletingTag(null);
            }
          }}
          onSuccess={() => setDeletingTag(null)}
          tagId={deletingTag._id}
        />
      ) : null}
    </div>
  );
}
