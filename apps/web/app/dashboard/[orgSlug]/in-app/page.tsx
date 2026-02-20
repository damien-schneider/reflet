"use client";

import { ChatCircle, Code, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { H1, H3, Muted, Text } from "@/components/ui/typography";
import { WidgetCard } from "@/features/in-app/components/widget-card";

export default function WidgetsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const widgets = useQuery(
    api.widget_admin.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const createWidget = useMutation(api.widget_admin.create);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [widgetName, setWidgetName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
        organizationId: org._id,
        name: widgetName.trim(),
      });
      setWidgetName("");
      setIsDialogOpen(false);
    } catch {
      // Widget creation failed
    }
    setIsCreating(false);
  };

  return (
    <div className="admin-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1>In-App</H1>
          <Text variant="bodySmall">
            Manage in-app integrations for your website and application
          </Text>
        </div>
        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Live Chat
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new live chat</DialogTitle>
              <DialogDescription>
                Add a live chat to your website. Messages will appear in your
                inbox.
              </DialogDescription>
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
                <Muted className="text-xs">
                  A name to identify this chat (e.g., &quot;Marketing
                  Site&quot;, &quot;Support Chat&quot;)
                </Muted>
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

      {widgets && widgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.map((widget) => (
            <WidgetCard key={widget._id} orgSlug={orgSlug} widget={widget} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ChatCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <H3 className="mb-2" variant="card">
              No integrations yet
            </H3>
            <Muted className="mb-4">
              Add a live chat to your website to collect support messages.
            </Muted>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Live Chat
              </Button>
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <Code className="h-4 w-4" />
                <Text variant="bodySmall">
                  Just add one script tag to your website
                </Text>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
