"use client";

import {
  Buildings,
  Check,
  Globe,
  Link as LinkIcon,
  Spinner,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

export default function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const router = useRouter();
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const updateOrg = useMutation(api.organizations.actions.update);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  useEffect(
    function syncOrgSettings() {
      if (org) {
        setName(org.name);
        setSlug(org.slug);
        setIsPublic(org.isPublic ?? false);
      }
    },
    [org]
  );

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

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
    setError(null);
  };

  const handleSave = async () => {
    if (!(org?._id && isAdmin)) {
      return;
    }

    if (!slug.trim()) {
      setError("Slug cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const trimmedSlug = slug.trim();
      await updateOrg({
        organizationId: org._id,
        name: name.trim(),
        slug: trimmedSlug,
        isPublic,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (trimmedSlug !== orgSlug) {
        router.replace(`/dashboard/${trimmedSlug}/settings`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save changes");
      }
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
    <div>
      <div className="mb-8">
        <H1>General Gear</H1>
        <Text variant="bodySmall">
          Manage your organization&apos;s basic settings
        </Text>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Buildings className="h-5 w-5" />
              <H3 variant="section">Organization Details</H3>
            </div>
            <Muted>Update your organization name and URL</Muted>
          </div>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="org-slug">
                <span className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Organization URL
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  /dashboard/
                </span>
                <Input
                  className="flex-1"
                  disabled={!isAdmin}
                  id="org-slug"
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-organization"
                  value={slug}
                />
              </div>
              <Text variant="caption">
                This is the URL identifier for your organization. Only lowercase
                letters, numbers, and hyphens are allowed.
              </Text>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <H3 variant="section">Visibility</H3>
            </div>
            <Muted>
              Control who can see your organization&apos;s public pages
            </Muted>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public-toggle">Public Organization</Label>
              <Muted>
                Allow anyone to view your public roadmap and changelog
              </Muted>
            </div>
            <Switch
              checked={isPublic}
              disabled={!isAdmin}
              id="public-toggle"
              onCheckedChange={setIsPublic}
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {isAdmin ? (
          <Button
            className="w-full"
            disabled={isSaving || !name.trim() || !slug.trim()}
            onClick={handleSave}
          >
            {getButtonContent()}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
