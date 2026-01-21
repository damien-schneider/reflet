"use client";

import { Buildings, Check, Globe, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function GeneralGearPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const updateOrg = useMutation(api.organizations_actions.update);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setIsPublic(org.isPublic ?? false);
    }
  }, [org]);

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

  const handleSave = async () => {
    if (!(org?._id && isAdmin)) {
      return;
    }

    setIsSaving(true);
    try {
      await updateOrg({
        organizationId: org._id as Id<"organizations">,
        name: name.trim(),
        isPublic,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const getButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      );
    }
    if (saved) {
      return (
        <>
          <Check className="mr-2 h-4 w-4" />
          Saved
        </>
      );
    }
    return "Save Changes";
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-bold text-2xl">General Gear</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s basic settings
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Buildings className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>Update your organization name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                disabled={!isAdmin}
                id="org-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="My Organization"
                value={name}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Visibility
            </CardTitle>
            <CardDescription>
              Control who can see your organization&apos;s public pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public-toggle">Public Organization</Label>
                <p className="text-muted-foreground text-sm">
                  Allow anyone to view your public roadmap and changelog
                </p>
              </div>
              <Switch
                checked={isPublic}
                disabled={!isAdmin}
                id="public-toggle"
                onCheckedChange={setIsPublic}
              />
            </div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Button
            className="w-full"
            disabled={isSaving || !name.trim()}
            onClick={handleSave}
          >
            {getButtonContent()}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
