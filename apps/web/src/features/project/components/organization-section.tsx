"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent, CardFooter } from "@ctrl-ui/react/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { InputGroup, InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Check } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandingSection } from "./branding-section";
import { SettingsPage, SettingsSection } from "./settings-page";

const SAVED_STATUS_MS = 2000;
const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-|-$/g;

const generateSlug = (text: string): string =>
  text.toLowerCase().replace(NON_SLUG_CHARS, "-").replace(EDGE_HYPHENS, "");

interface OrganizationSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

interface OrganizationValues {
  _id: Id<"organizations">;
  isPublic?: boolean;
  name: string;
  slug: string;
}

export function OrganizationSection({
  isAdmin,
  organizationId,
  orgSlug,
}: OrganizationSectionProps) {
  const org = useQuery(api.organizations.queries.get, { id: organizationId });

  return (
    <SettingsPage
      description="Your organization’s name, public URL, visibility and branding."
      title="Organization"
    >
      <SettingsSection title="Details">
        {org ? (
          <OrganizationDetailsForm
            isAdmin={isAdmin}
            key={org._id}
            org={org}
            orgSlug={orgSlug}
          />
        ) : (
          <Skeleton aria-busy="true" className="h-56 w-full" />
        )}
      </SettingsSection>

      <SettingsSection
        description="Anyone with the link can view your roadmap and changelog."
        title="Visibility"
      >
        {org ? (
          <VisibilityCard isAdmin={isAdmin} key={org._id} org={org} />
        ) : (
          <Skeleton aria-busy="true" className="h-20 w-full" />
        )}
      </SettingsSection>

      <SettingsSection
        description="Shown on your public pages and in the feedback widget."
        title="Branding"
      >
        <Card>
          <CardContent>
            <BrandingSection
              isAdmin={isAdmin}
              organizationId={organizationId}
              orgSlug={orgSlug}
            />
          </CardContent>
        </Card>
      </SettingsSection>
    </SettingsPage>
  );
}

interface OrganizationFormProps {
  isAdmin: boolean;
  org: OrganizationValues;
  orgSlug: string;
}

function OrganizationDetailsForm({
  isAdmin,
  org,
  orgSlug,
}: OrganizationFormProps) {
  const router = useRouter();
  const updateOrg = useMutation(api.organizations.mutations.update);
  const [nameDraft, setName] = useState<string | null>(null);
  const [slugDraft, setSlug] = useState<string | null>(null);
  const name = nameDraft ?? org.name;
  const slug = slugDraft ?? org.slug;
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const hasChanges = name !== org.name || slug !== org.slug;
  const canSave = isAdmin && hasChanges && trimmedName && trimmedSlug;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave || isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateOrg({ id: org._id, name: trimmedName, slug: trimmedSlug });
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(
        () => setSaved(false),
        SAVED_STATUS_MS
      );
      if (trimmedSlug !== orgSlug) {
        router.replace(`/dashboard/${trimmedSlug}/project/general`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save changes");
    }
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="org-name">Name</FieldLabel>
            <Input
              autoComplete="organization"
              disabled={!isAdmin}
              id="org-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="My organization"
              value={name}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="org-slug">URL</FieldLabel>
            <InputGroup data-disabled={!isAdmin || undefined}>
              <InputGroupAddon>/dashboard/</InputGroupAddon>
              <Input
                aria-describedby="org-slug-description org-slug-error"
                aria-invalid={error ? true : undefined}
                autoCapitalize="none"
                disabled={!isAdmin}
                id="org-slug"
                onChange={(event) => {
                  setSlug(generateSlug(event.target.value));
                  setError(null);
                }}
                placeholder="my-organization"
                spellCheck={false}
                value={slug}
              />
            </InputGroup>
            <FieldDescription id="org-slug-description">
              Lowercase letters, numbers and hyphens. Changing it breaks
              existing links.
            </FieldDescription>
            <FieldError id="org-slug-error" match={error !== null} role="alert">
              {error}
            </FieldError>
          </Field>
        </CardContent>

        {isAdmin ? (
          <CardFooter className="justify-end">
            <Button
              disabled={isSaving || !canSave}
              size="sm"
              tone="primary"
              type="submit"
              variant="solid"
            >
              <SaveButtonContent isSaving={isSaving} saved={saved} />
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </form>
  );
}

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
        <Spinner aria-hidden data-icon="inline-start" size="xs" />
        Saving…
      </>
    );
  }
  if (saved) {
    return (
      <>
        <Check aria-hidden />
        Saved
      </>
    );
  }
  return "Save changes";
}

function VisibilityCard({
  isAdmin,
  org,
}: {
  isAdmin: boolean;
  org: OrganizationValues;
}) {
  const updateOrg = useMutation(api.organizations.mutations.update);
  const [isPublic, setIsPublic] = useState(org.isPublic ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (checked: boolean) => {
    setIsPublic(checked);
    setIsUpdating(true);
    setError(null);
    try {
      await updateOrg({ id: org._id, isPublic: checked });
    } catch {
      setIsPublic(!checked);
      setError("Couldn’t update visibility. Try again.");
    }
    setIsUpdating(false);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-label">Public organization</span>
            <span
              className="text-caption text-muted-foreground"
              id="public-toggle-status"
            >
              {isPublic
                ? "Public pages are live."
                : "Only members can see your pages."}
            </span>
          </div>
          <Switch
            aria-describedby="public-toggle-status"
            aria-label="Make organization public"
            checked={isPublic}
            disabled={!isAdmin || isUpdating}
            id="public-toggle"
            onCheckedChange={handleChange}
          />
        </div>
        {error ? (
          <p className="text-caption text-destructive-text" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
