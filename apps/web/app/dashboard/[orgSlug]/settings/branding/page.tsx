"use client";

import { Check, PaintBrush, Sparkle, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { H1, H2, Muted, Text } from "@/components/ui/typography";
import { LogoUploader } from "@/features/organizations/components/logo-uploader";
import {
  generateColorPalette,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/color-utils";

const DEFAULT_PRIMARY_COLOR = "#5c6d4f";

export default function BrandingSettingsPage({
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
  const updateOrg = useMutation(api.organizations.update);

  const [logo, setLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [colorInput, setColorInput] = useState(DEFAULT_PRIMARY_COLOR);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isProTier = org?.subscriptionTier === "pro";
  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const isLogoDisabled = !isAdmin;
  const isBrandingDisabled = !(isAdmin && isProTier);

  useEffect(() => {
    if (org) {
      setLogo(org.logo ?? null);
      const color = org.primaryColor ?? DEFAULT_PRIMARY_COLOR;
      setPrimaryColor(color);
      setColorInput(color);
    }
  }, [org]);

  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    if (isValidHexColor(value)) {
      setPrimaryColor(normalizeHexColor(value));
    }
  };

  const handleColorPickerChange = (value: string) => {
    setPrimaryColor(value);
    setColorInput(value);
  };

  const handleSave = async () => {
    if (!(org?._id && isAdmin)) {
      return;
    }

    setIsSaving(true);
    try {
      await updateOrg({
        id: org._id as Id<"organizations">,
        logo: logo ?? undefined,
        ...(isProTier ? { primaryColor } : {}),
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

  const colorPalette = generateColorPalette(primaryColor);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <PaintBrush className="h-8 w-8 text-muted-foreground" />
          <div>
            <H1>Branding</H1>
            <Text variant="bodySmall">
              Customize how your organization appears on public pages
            </Text>
          </div>
        </div>
      </div>

      {!isProTier && (
        <Card className="mb-6 border-olive-600/20 bg-olive-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-olive-600" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Custom colors and styling are available on the Pro plan. Upgrade
              to customize your brand colors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/${orgSlug}/settings/billing`}>
              <Button>
                <Sparkle className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Upload your organization logo. Displayed on public pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogoUploader
              currentLogo={logo}
              disabled={isLogoDisabled}
              onLogoChange={setLogo}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Primary Color</CardTitle>
                <CardDescription>
                  Used for buttons and accents on your public pages. Other
                  shades are derived automatically.
                </CardDescription>
              </div>
              {!isProTier && <Badge variant="secondary">Pro</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Color</Label>
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
              {!isValidHexColor(colorInput) && colorInput !== "" && (
                <p className="text-destructive text-sm">
                  Please enter a valid hex color (e.g., #5c6d4f)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your branding will look on public pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-background p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                      <span className="font-semibold">{org.name}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-muted-foreground text-sm">
                    <span>Feedback</span>
                    <span>Roadmap</span>
                    <span>Changelog</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button
                      className="transition-colors"
                      style={{
                        backgroundColor: colorPalette.primary,
                        color: colorPalette.primaryForeground,
                      }}
                    >
                      Primary Button
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
                      Secondary Button
                    </Button>
                  </div>
                  <div
                    className="rounded-lg p-4"
                    style={{ backgroundColor: colorPalette.primaryLight }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: colorPalette.primary }}
                    >
                      This is how accent backgrounds will appear
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        borderColor: colorPalette.primary,
                        color: colorPalette.primary,
                      }}
                      variant="outline"
                    >
                      v1.2.0
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      Version badge preview
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button
            className="w-full"
            disabled={isSaving || !isValidHexColor(colorInput)}
            onClick={handleSave}
          >
            {getButtonContent()}
          </Button>
        )}
      </div>
    </div>
  );
}
