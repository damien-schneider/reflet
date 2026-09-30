"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ctrl-ui/react/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, use, useState } from "react";
import { Label } from "@/components/ui/label";
import { H3, Muted } from "@/components/ui/typography";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { FeedbackCollectorCard } from "@/features/in-app/components/feedback-collector-card";
import {
  WidgetCard,
  type WidgetWithSettings,
} from "@/features/in-app/components/widget-card";

function WidgetList({
  orgSlug,
  widgets,
}: {
  orgSlug: string;
  widgets: WidgetWithSettings[] | undefined;
}) {
  if (widgets === undefined) {
    return (
      <div
        aria-label="Loading live chats"
        className="grid gap-4 md:grid-cols-2"
        role="status"
      >
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-12">
        <EmptyHeader>
          <EmptyTitle>No live chat yet</EmptyTitle>
          <EmptyDescription>
            Add a live chat to talk with visitors right on your site.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {widgets.map((widget) => (
        <WidgetCard key={widget._id} orgSlug={orgSlug} widget={widget} />
      ))}
    </div>
  );
}

function CreateLiveChatDialog({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const createWidget = useMutation(api.widget.admin.create);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      await createWidget({ name: name.trim(), organizationId });
      setName("");
      setIsOpen(false);
    } catch {
      toast.error("Couldn’t create the live chat. Try again.");
    }
    setIsCreating(false);
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger render={<Button size="sm" variant="surface" />}>
        <Plus aria-hidden className="size-4" />
        Add live chat
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New live chat</DialogTitle>
          <DialogDescription>
            You’ll get an embed code to add to your site.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-2"
          id="create-live-chat"
          onSubmit={handleSubmit}
        >
          <Label htmlFor="widget-name">Name</Label>
          <Input
            autoFocus
            id="widget-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main website"
            value={name}
          />
        </form>
        <DialogFooter>
          <DialogClose variant="surface">Cancel</DialogClose>
          <Button
            disabled={!name.trim() || isCreating}
            form="create-live-chat"
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isCreating ? "Creating…" : "Create live chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const publicKey =
    apiKeys?.find((apiKey) => apiKey.isActive)?.publicKey ??
    apiKeys?.[0]?.publicKey;

  if (org === undefined) {
    return (
      <PageLayout scroll="page" width="content">
        <PageHeader>
          <Skeleton className="h-9 w-32" />
        </PageHeader>
        <PageBody>
          <div aria-label="Loading in-app" className="space-y-6" role="status">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-44 w-full" />
          </div>
        </PageBody>
      </PageLayout>
    );
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>In-app</PageTitle>
      </PageHeader>
      <PageBody>
        <FeedbackCollectorCard
          canManageKeys={org.role === "admin" || org.role === "owner"}
          isLoading={apiKeys === undefined}
          organizationId={org._id}
          orgSlug={orgSlug}
          publicKey={publicKey}
        />

        <section
          aria-labelledby="live-chat-heading"
          className="mt-10 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <H3 id="live-chat-heading" variant="card">
                Live chat
              </H3>
              <Muted>A chat window your visitors can open on any page.</Muted>
            </div>
            <CreateLiveChatDialog organizationId={org._id} />
          </div>

          <WidgetList orgSlug={orgSlug} widgets={widgets} />
        </section>
      </PageBody>
    </PageLayout>
  );
}
