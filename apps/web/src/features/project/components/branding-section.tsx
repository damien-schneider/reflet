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
import { Field, FieldDescription, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoUploader } from "@/features/organizations/components/logo-uploader";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

const AUTOSAVE_DEBOUNCE_MS = 800;
const SAVED_STATUS_MS = 2000;

type SaveStatus = "idle" | "saving" | "saved" | "error";

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

  if (!org || billingStatus === undefined) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <BrandingForm
      initialColor={org.primaryColor ?? DEFAULT_PRIMARY_COLOR}
      initialLogo={org.logo ?? null}
      isAdmin={isAdmin}
      isProTier={billingStatus?.tier === "pro"}
      key={org._id}
      organizationId={org._id}
      orgSlug={orgSlug}
    />
  );
}

interface BrandingFormProps {
  initialColor: string;
  initialLogo: string | null;
  isAdmin: boolean;
  isProTier: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

function BrandingForm({
  initialColor,
  initialLogo,
  isAdmin,
  isProTier,
  organizationId,
  orgSlug,
}: BrandingFormProps) {
  const updateOrg = useMutation(api.organizations.mutations.update);
  const [logo, setLogo] = useState(initialLogo);
  const [primaryColor, setPrimaryColor] = useState(initialColor);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(
    () => () => {
      clearTimeout(debounceTimerRef.current);
      clearTimeout(savedTimerRef.current);
    },
    []
  );

  const save = async (newLogo: string | null, newColor: string) => {
    if (!isAdmin) {
      return;
    }
    setSaveStatus("saving");
    try {
      await updateOrg({
        id: organizationId,
        logo: newLogo ?? undefined,
        ...(isProTier ? { primaryColor: newColor } : {}),
      });
      setSaveStatus("saved");
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(
        () => setSaveStatus("idle"),
        SAVED_STATUS_MS
      );
    } catch {
      setSaveStatus("error");
    }
  };

  const handleColorChange = (value: string) => {
    setPrimaryColor(value);
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      save(logo, value);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const handleLogoChange = (newLogo: string | null) => {
    setLogo(newLogo);
    clearTimeout(debounceTimerRef.current);
    save(newLogo, primaryColor);
  };

  return (
    <div className="flex flex-col gap-6">
      <Field>
        <FieldLabel>Logo</FieldLabel>
        <LogoUploader
          currentLogo={logo}
          disabled={!isAdmin}
          onLogoChange={handleLogoChange}
        />
      </Field>

      <PrimaryColorField
        disabled={!(isAdmin && isProTier)}
        isProTier={isProTier}
        onChange={handleColorChange}
        orgSlug={orgSlug}
        value={primaryColor}
      />

      <SaveStatusMessage status={saveStatus} />
    </div>
  );
}

interface PrimaryColorFieldProps {
  disabled: boolean;
  isProTier: boolean;
  onChange: (value: string) => void;
  orgSlug: string;
  value: string;
}

function PrimaryColorField({
  disabled,
  isProTier,
  onChange,
  orgSlug,
  value,
}: PrimaryColorFieldProps) {
  return (
    <Field>
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor="primary-color">Primary color</FieldLabel>
        {isProTier ? null : (
          <Badge size="sm" variant="outline">
            Pro
          </Badge>
        )}
      </div>
      <ColorPicker
        disabled={disabled}
        format="hex"
        onValueChange={onChange}
        value={value}
      >
        <div className="flex items-center gap-2">
          <ColorPickerTrigger aria-label="Pick the organization primary color" />
          <ColorPickerInput
            aria-describedby={isProTier ? undefined : "primary-color-upsell"}
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
      {isProTier ? null : (
        <FieldDescription id="primary-color-upsell">
          Custom colors are part of Pro.{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href={`/dashboard/${orgSlug}/project/billing`}
          >
            Compare plans
          </Link>
        </FieldDescription>
      )}
    </Field>
  );
}

function SaveStatusMessage({ status }: { status: SaveStatus }) {
  return (
    <p
      aria-live="polite"
      className="flex min-h-5 items-center justify-end gap-1.5 text-caption text-muted-foreground"
    >
      {status === "saving" ? (
        <>
          <Spinner aria-hidden size="xs" />
          Saving…
        </>
      ) : null}
      {status === "saved" ? (
        <>
          <Check aria-hidden className="size-3.5 text-success-text" />
          Saved
        </>
      ) : null}
      {status === "error" ? (
        <span className="flex items-center gap-1.5 text-destructive-text">
          <WarningCircle aria-hidden className="size-3.5" />
          Couldn’t save branding. Try again.
        </span>
      ) : null}
    </p>
  );
}
