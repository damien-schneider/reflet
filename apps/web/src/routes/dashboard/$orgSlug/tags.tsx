"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag-dialog";
import { TagCard } from "@/features/tags/components/tag-card";
import { TagFormDialog } from "@/features/tags/components/tag-form-dialog";

export const Route = createFileRoute("/dashboard/$orgSlug/tags")({
  component: TagsPage,
});

function TagsPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const tags = useQuery(
    api.tag_manager.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<{
    _id: string;
    name: string;
    color: string;
    isDoneStatus: boolean;
    isRoadmapLane: boolean;
  } | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";
  const roadmapLanes = tags?.filter((t) => t.isRoadmapLane) || [];
  const regularTags = tags?.filter((t) => !t.isRoadmapLane) || [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Tags</h1>
          <p className="text-muted-foreground">
            Manage tags for categorizing feedback
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tag
          </Button>
        )}
      </div>

      {/* Roadmap Lanes */}
      {roadmapLanes.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 font-semibold text-lg">Roadmap Lanes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roadmapLanes.map((tag) => (
              <TagCard
                isAdmin={isAdmin}
                key={tag._id}
                onDelete={() => setTagToDelete(tag._id)}
                onEdit={() => setEditingTag(tag)}
                tag={tag}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Tags */}
      <div>
        <h2 className="mb-4 font-semibold text-lg">Tags</h2>
        {regularTags.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularTags.map((tag) => (
              <TagCard
                isAdmin={isAdmin}
                key={tag._id}
                onDelete={() => setTagToDelete(tag._id)}
                onEdit={() => setEditingTag(tag)}
                tag={tag}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="font-semibold text-lg">No tags yet</h3>
              <p className="mb-4 text-muted-foreground">
                Create tags to categorize your feedback.
              </p>
              {isAdmin && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tag
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <TagFormDialog
        editingTag={editingTag}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingTag(null);
          }
        }}
        onSuccess={() => {
          setShowCreateDialog(false);
          setEditingTag(null);
        }}
        open={showCreateDialog || !!editingTag}
        organizationId={org._id as Id<"organizations">}
      />

      <DeleteTagDialog
        onOpenChange={(open) => !open && setTagToDelete(null)}
        onSuccess={() => setTagToDelete(null)}
        tagId={tagToDelete}
      />
    </div>
  );
}
