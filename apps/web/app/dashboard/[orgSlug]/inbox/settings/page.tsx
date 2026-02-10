"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { H1, H2, Muted } from "@/components/ui/typography";

export default function InboxSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const supportSettings = useQuery(
    api.support_conversations.getSupportSettings,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const updateSupportSettings = useMutation(
    api.support_conversations.updateSupportSettings
  );

  const [supportEnabled, setSupportEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (supportSettings) {
      setSupportEnabled(supportSettings.supportEnabled);
    }
  }, [supportSettings]);

  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  const handleToggle = async (checked: boolean) => {
    setSupportEnabled(checked);

    if (!org?._id) {
      return;
    }

    setIsSaving(true);
    try {
      await updateSupportSettings({
        organizationId: org._id as Id<"organizations">,
        supportEnabled: checked,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Access Denied</H2>
          <Muted className="mt-2">
            You don&apos;t have permission to access inbox settings.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <H1 className="mb-8">Inbox Settings</H1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChatCircle className="h-5 w-5" />
              Public Support Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="support-toggle">Enable support page</Label>
              <Switch
                checked={supportEnabled}
                disabled={isSaving}
                id="support-toggle"
                onCheckedChange={handleToggle}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
