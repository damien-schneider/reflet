"use client";

import { Check, Globe, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BrandingSection } from "./branding-section";

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

function SaveButtonContent({
  isSaving,
  saved,
}: {
  isSaving: boolean;
  saved: boolean;
}) {
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
}

interface OrganizationSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function OrganizationSection({
  isAdmin,
  organizationId,
  orgSlug,
}: OrganizationSectionProps) {
  const router = useRouter();
  const org = useQuery(api.organizations.queries.get, { id: organizationId });
  const updateOrg = useMutation(api.organizations.mutations.update);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    function syncOrgFormState() {
      if (org) {
        setName(org.name);
        setSlug(org.slug);
        setIsPublic(org.isPublic ?? false);
      }
    },
    [org]
  );

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
    setError(null);
  };

  const handleSave = async () => {
    if (!isAdmin) {
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
        id: organizationId,
        name: name.trim(),
        slug: trimmedSlug,
        isPublic,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (trimmedSlug !== orgSlug) {
        router.replace(`/dashboard/${trimmedSlug}/project/general`);
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

  const hasChanges =
    org &&
    (name !== org.name ||
      slug !== org.slug ||
      isPublic !== (org.isPublic ?? false));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your organization name and URL slug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="org-name">Organization Name</FieldLabel>
            <Input
              disabled={!isAdmin}
              id="org-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
              value={name}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="org-slug">Organization URL</FieldLabel>
            <div className="flex items-center gap-0 rounded-md border bg-muted/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
              <span className="shrink-0 select-none border-r bg-muted px-3 py-2 text-muted-foreground text-sm">
                /dashboard/
              </span>
              <Input
                className="border-0 shadow-none focus-visible:ring-0"
                disabled={!isAdmin}
                id="org-slug"
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-organization"
                value={slug}
              />
            </div>
            <FieldDescription>
              Only lowercase letters, numbers, and hyphens
            </FieldDescription>
          </Field>
        </CardContent>

        {isAdmin ? (
          <CardFooter className="justify-between">
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : (
              <div />
            )}
            <Button
              disabled={isSaving || !name.trim() || !slug.trim() || !hasChanges}
              onClick={handleSave}
              size="sm"
            >
              <SaveButtonContent isSaving={isSaving} saved={saved} />
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Visibility
              </CardTitle>
              <CardDescription>
                Control who can see your public pages
              </CardDescription>
            </div>
            <Switch
              checked={isPublic}
              disabled={!isAdmin}
              id="public-toggle"
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            When enabled, anyone can view your public roadmap and changelog
            without signing in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize your logo and color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingSection
            isAdmin={isAdmin}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </CardContent>
      </Card>
    </div>
  );
}
