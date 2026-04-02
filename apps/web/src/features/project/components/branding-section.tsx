"use client";

import { Check, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/features/organizations/components/logo-uploader";
import {
  generateColorPalette,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/color-utils";

const DEFAULT_PRIMARY_COLOR = "#5c6d4f";
const AUTOSAVE_DEBOUNCE_MS = 800;

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
  const [colorInput, setColorInput] = useState(DEFAULT_PRIMARY_COLOR);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isProTier = billingStatus?.tier === "pro";
  const isLogoDisabled = !isAdmin;
  const isBrandingDisabled = !(isAdmin && isProTier);

  useEffect(
    function syncOrgBrandingState() {
      if (org) {
        setLogo(org.logo ?? null);
        const color = org.primaryColor ?? DEFAULT_PRIMARY_COLOR;
        setPrimaryColor(color);
        setColorInput(color);
      }
    },
    [org]
  );

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
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  };

  const debouncedSave = (newLogo: string | null, newColor: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      save(newLogo, newColor);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    if (isValidHexColor(value)) {
      const normalized = normalizeHexColor(value);
      setPrimaryColor(normalized);
      debouncedSave(logo, normalized);
    }
  };

  const handleColorPickerChange = (value: string) => {
    setPrimaryColor(value);
    setColorInput(value);
    debouncedSave(logo, value);
  };

  const handleLogoChange = (newLogo: string | null) => {
    setLogo(newLogo);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    save(newLogo, primaryColor);
  };

  useEffect(function cleanupDebounceTimers() {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const colorPalette = generateColorPalette(primaryColor);

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <LogoUploader
          currentLogo={logo}
          disabled={isLogoDisabled}
          onLogoChange={handleLogoChange}
        />
      </div>

      {/* Primary Color */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="primary-color">Primary Color</Label>
          {isProTier ? null : (
            <Link href={`/dashboard/${orgSlug}/project`}>
              <Badge
                className="bg-olive-600/10 text-olive-600"
                variant="secondary"
              >
                Pro
              </Badge>
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            className="h-10 w-14 cursor-pointer p-1"
            disabled={isBrandingDisabled}
            id="primary-color-picker"
            onChange={(e) => handleColorPickerChange(e.target.value)}
            type="color"
            value={primaryColor}
          />
          <Input
            className="flex-1"
            disabled={isBrandingDisabled}
            id="primary-color"
            onChange={(e) => handleColorInputChange(e.target.value)}
            placeholder="#5c6d4f"
            value={colorInput}
          />
        </div>
        {!isValidHexColor(colorInput) && colorInput !== "" ? (
          <p className="text-destructive text-sm">
            Please enter a valid hex color (e.g., #5c6d4f)
          </p>
        ) : null}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-background p-4">
            <div className="mb-4 flex items-center gap-3">
              {logo ? (
                <div className="relative h-8 w-24">
                  <Image
                    alt="Logo preview"
                    className="object-contain"
                    fill
                    src={logo}
                  />
                </div>
              ) : (
                <span className="font-semibold">{org?.name}</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                className="transition-colors"
                style={{
                  backgroundColor: colorPalette.primary,
                  color: colorPalette.primaryForeground,
                }}
              >
                Primary
              </Button>
              <Button
                className="transition-colors"
                style={{
                  backgroundColor: colorPalette.primaryLight,
                  borderColor: colorPalette.primary,
                  color: colorPalette.primary,
                }}
                variant="outline"
              >
                Secondary
              </Button>
            </div>
          </div>
        </div>
      </div>

      {saveStatus === "idle" ? null : (
        <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm">
          {saveStatus === "saving" ? (
            <>
              <Spinner className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : null}
          {saveStatus === "saved" ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Saved</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
