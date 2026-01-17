import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard/$orgSlug/settings/")({
  component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const updateOrg = useMutation(api.organizations.update);
  const deleteOrg = useMutation(api.organizations_actions.remove);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Initialize form values when org loads
  if (org && !name && !slug) {
    setName(org.name);
    setSlug(org.slug);
  }

  const handleSave = async () => {
    if (!(org?._id && name.trim() && slug.trim())) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateOrg({
        id: org._id as Id<"organizations">,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
      });
      // Navigate to new slug if changed
      if (slug.trim().toLowerCase() !== org.slug) {
        navigate({
          to: "/dashboard/$orgSlug/settings",
          params: { orgSlug: slug.trim().toLowerCase() },
        });
      }
    } catch (error) {
      console.error("Failed to update organization:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!org?._id || deleteConfirmation !== org.name) {
      return;
    }

    try {
      await deleteOrg({ id: org._id as Id<"organizations"> });
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Failed to delete organization:", error);
    }
  };

  if (!org) {
    return <div>Loading...</div>;
  }

  const isOwner = org.role === "owner";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Update your organization's basic information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">reflet.app/</span>
              <Input
                id="slug"
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="my-org"
                value={slug}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              This is used in your public board URLs.
            </p>
          </div>
          <Button disabled={isSubmitting} onClick={handleSave}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete organization</p>
                <p className="text-muted-foreground text-sm">
                  Permanently delete this organization and all its data.
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              organization <strong>{org.name}</strong> and all its data
              including boards, feedback, and members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>
              Type <strong>{org.name}</strong> to confirm
            </Label>
            <Input
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={org.name}
              value={deleteConfirmation}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteConfirmation !== org.name}
              onClick={handleDelete}
              variant="destructive"
            >
              Delete organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
