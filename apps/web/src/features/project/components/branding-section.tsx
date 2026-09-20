"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerHue,
  ColorPickerInput,
  ColorPickerTrigger,
} from "@ctrl-ui/react/ui/color-picker";
import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoUploader } from "@/features/organizations/components/logo-uploader";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

const AUTOSAVE_DEBOUNCE_MS = 800;
const SAVED_BADGE_MS = 2000;

interface BrandingSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function BrandingSection({
  isAdmin,
  organizationId,
  orgSlug,
}: BrandingSectionProps) {
  const org = useQuery(api.organizations.queries.get, { id: organizationId });
  const billingStatus = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  const updateOrg = useMutation(api.organizations.mutations.update);

  const [logo, setLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isProTier = billingStatus?.tier === "pro";
  const isBrandingDisabled = !(isAdmin && isProTier);

  useEffect(() => {
    if (org) {
      setLogo(org.logo ?? null);
      setPrimaryColor(org.primaryColor ?? DEFAULT_PRIMARY_COLOR);
    }
  }, [org]);

  const save = async (newLogo: string | null, newColor: string) => {
    if (!(org?._id && isAdmin)) {
      return;
    }
    setSaveStatus("saving");
    try {
      await updateOrg({
        id: org._id,
        logo: newLogo ?? undefined,
        ...(isProTier ? { primaryColor: newColor } : {}),
      });
      setSaveStatus("saved");
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = setTimeout(
        () => setSaveStatus("idle"),
        SAVED_BADGE_MS
      );
    } catch {
      setSaveStatus("idle");
    }
  };

  const handleColorChange = (value: string) => {
    setPrimaryColor(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      save(logo, value);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const handleLogoChange = (newLogo: string | null) => {
    setLogo(newLogo);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    save(newLogo, primaryColor);
  };

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <Field>
        <FieldLabel>Logo</FieldLabel>
        <LogoUploader
          currentLogo={logo}
          disabled={!isAdmin}
          onLogoChange={handleLogoChange}
        />
      </Field>

      <Field>
        <div className="flex w-full items-center justify-between">
          <FieldLabel htmlFor="primary-color">Primary Color</FieldLabel>
          {isProTier ? null : (
            <Link href={`/dashboard/${orgSlug}/project/billing`}>
              <Badge className="bg-brand-subtle text-brand-text">Pro</Badge>
            </Link>
          )}
        </div>
        <ColorPicker
          disabled={isBrandingDisabled}
          format="hex"
          onValueChange={handleColorChange}
          value={primaryColor}
        >
          <div className="flex items-center gap-2">
            <ColorPickerTrigger aria-label="Pick the organization primary color" />
            <ColorPickerInput
              aria-label="Primary color"
              className="flex-1"
              id="primary-color"
            />
          </div>
          <ColorPickerContent>
            <ColorPickerArea />
            <ColorPickerHue />
          </ColorPickerContent>
        </ColorPicker>
      </Field>

      {saveStatus === "idle" ? null : (
        <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm">
          {saveStatus === "saving" ? (
            <>
              <Spinner size="xs" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Saved</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
