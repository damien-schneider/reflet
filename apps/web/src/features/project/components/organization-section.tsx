"use client";

import { Check, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BrandingSection } from "./branding-section";

const generateSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

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
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlug(org.slug);
      setIsPublic(org.isPublic ?? false);
    }
  }, [org]);

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

  const hasChanges = org && (name !== org.name || slug !== org.slug);

  const handleVisibilityChange = async (checked: boolean) => {
    const previousValue = isPublic;
    setIsPublic(checked);
    setIsUpdatingVisibility(true);
    setVisibilityError(null);
    try {
      await updateOrg({ id: organizationId, isPublic: checked });
    } catch {
      setIsPublic(previousValue);
      setVisibilityError("Could not update visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-semibold text-lg">Organization</h1>

      <section className="space-y-4 border-b pb-8">
        <h2 className="font-medium text-sm">Details</h2>
        <Field>
          <FieldLabel htmlFor="org-name">Name</FieldLabel>
          <Input
            disabled={!isAdmin}
            id="org-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="My organization"
            value={name}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="org-slug">URL</FieldLabel>
          <div className="flex items-center gap-0 rounded-md border bg-muted/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
            <span className="shrink-0 select-none border-r bg-muted px-3 py-2 text-muted-foreground text-sm">
              /dashboard/
            </span>
            <Input
              className="border-0 shadow-none focus-visible:ring-0"
              disabled={!isAdmin}
              id="org-slug"
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="my-organization"
              value={slug}
            />
          </div>
          <FieldDescription>
            Lowercase letters, numbers, and hyphens
          </FieldDescription>
        </Field>

        {isAdmin ? (
          <div className="flex items-center justify-between gap-4">
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
          </div>
        ) : null}
      </section>

      <section className="border-b pb-8">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="font-medium text-sm">Public</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Anyone can view your roadmap and changelog.
            </p>
          </div>
          <Switch
            aria-label="Make organization public"
            checked={isPublic}
            disabled={!isAdmin || isUpdatingVisibility}
            id="public-toggle"
            onCheckedChange={handleVisibilityChange}
          />
        </div>
        {visibilityError ? (
          <p className="mt-2 text-destructive text-sm">{visibilityError}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-sm">Branding</h2>
        <BrandingSection
          isAdmin={isAdmin}
          organizationId={organizationId}
          orgSlug={orgSlug}
        />
      </section>
    </div>
  );
}
