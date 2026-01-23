"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { H1, H2, Muted, Text } from "@/components/ui/typography";

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

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
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
      <div className="mb-8">
        <H1>Inbox Settings</H1>
        <Text variant="bodySmall">Configure your support inbox settings</Text>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChatCircle className="h-5 w-5" />
              Public Support Page
            </CardTitle>
            <CardDescription>
              Allow users to contact your support team through the public
              website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="support-toggle">Enable Support Page</Label>
                <Text variant="bodySmall">
                  When enabled, a &quot;Support&quot; link will appear in your
                  public navigation, allowing users to send messages to your
                  team.
                </Text>
              </div>
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
