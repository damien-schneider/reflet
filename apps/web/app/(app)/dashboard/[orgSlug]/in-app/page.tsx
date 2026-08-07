"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, H3, Muted } from "@/components/ui/typography";
import { FeedbackCollectorCard } from "@/features/in-app/components/feedback-collector-card";
import { WidgetCard } from "@/features/in-app/components/widget-card";

export default function WidgetsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const widgets = useQuery(
    api.widget.admin.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const apiKeys = useQuery(
    api.feedback.api_admin.getApiKeys,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const createWidget = useMutation(api.widget.admin.create);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [widgetName, setWidgetName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const publicKey =
    apiKeys?.find((apiKey) => apiKey.isActive)?.publicKey ??
    apiKeys?.[0]?.publicKey;

  if (org === undefined) {
    return (
      <div
        aria-label="Loading in-app"
        className="admin-container space-y-6"
        role="status"
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H3 variant="card">Organization not found</H3>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </Muted>
        </div>
      </div>
    );
  }

  const handleCreateWidget = async () => {
    if (!(widgetName.trim() && org?._id)) {
      return;
    }

    setIsCreating(true);
    try {
      await createWidget({
        name: widgetName.trim(),
        organizationId: org._id,
      });
      setWidgetName("");
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to create live chat");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <H1>In-app</H1>
        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add live chat
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create live chat</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="widget-name">Name</Label>
                <Input
                  id="widget-name"
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="Main Website Chat"
                  value={widgetName}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!widgetName.trim() || isCreating}
                onClick={handleCreateWidget}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <FeedbackCollectorCard
        isLoading={apiKeys === undefined}
        orgSlug={orgSlug}
        publicKey={publicKey}
      />

      <H3 className="mt-8 mb-4" variant="card">
        Live chat
      </H3>

      {widgets && widgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.map((widget) => (
            <WidgetCard key={widget._id} orgSlug={orgSlug} widget={widget} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No live chats
        </p>
      )}
    </div>
  );
}
