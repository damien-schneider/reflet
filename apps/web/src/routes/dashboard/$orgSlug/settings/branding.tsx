import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Image as ImageIcon, Palette } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

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

export const Route = createFileRoute("/dashboard/$orgSlug/settings/branding")({
  component: BrandingSettingsPage,
});

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#64748b", // Slate
];

function BrandingSettingsPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const subscription = useQuery(
    api.subscriptions.getStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const updateOrg = useMutation(api.organizations.update);

  const [primaryColor, setPrimaryColor] = useState("");
  const [logo, setLogo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form values when org loads
  if (org && !primaryColor && !logo) {
    setPrimaryColor(org.primaryColor || "#3b82f6");
    setLogo(org.logo || "");
  }

  const handleSave = async () => {
    if (!org?._id) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateOrg({
        id: org._id as Id<"organizations">,
        primaryColor,
        logo: logo || undefined,
      });
    } catch (error) {
      console.error("Failed to update branding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!org) {
    return <div>Loading...</div>;
  }

  const isPro = subscription?.status === "active";

  return (
    <div className="space-y-6">
      {!isPro && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Custom branding is a Pro feature</p>
                <p className="text-muted-foreground text-sm">
                  Upgrade to Pro to customize your organization's appearance.
                </p>
              </div>
            </div>
            <Badge className="text-amber-500" variant="outline">
              Pro
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className={isPro ? "" : "pointer-events-none opacity-50"}>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            Customize the primary color used throughout your public pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Primary Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  className={`h-10 w-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                    primaryColor === color
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  key={color}
                  onClick={() => setPrimaryColor(color)}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customColor">Custom color</Label>
            <div className="flex gap-2">
              <div
                className="h-10 w-10 rounded-lg border"
                style={{ backgroundColor: primaryColor }}
              />
              <Input
                className="font-mono"
                id="customColor"
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                type="text"
                value={primaryColor}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={isPro ? "" : "pointer-events-none opacity-50"}>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Your logo will be displayed on public pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="logo">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="logo"
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={logo}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Use a URL to an image file (PNG, SVG, or WebP recommended).
            </p>
          </div>
          {logo && (
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">Preview</p>
                {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: img error handler prevents broken previews */}
                <img
                  alt="Logo preview"
                  className="mt-2 h-12 max-w-[200px] object-contain"
                  height={48}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  src={logo}
                  width={200}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={isPro ? "" : "pointer-events-none opacity-50"}>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your branding will look on public pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-6"
            style={
              {
                "--primary": primaryColor,
              } as CSSProperties
            }
          >
            <div className="mb-4 flex items-center gap-3">
              {logo ? (
                <img
                  alt="Logo"
                  className="h-8 max-w-[120px] object-contain"
                  height={32}
                  src={logo}
                  width={120}
                />
              ) : (
                <div className="font-bold text-xl">{org.name}</div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  className="rounded-lg px-4 py-2 font-medium text-sm text-white"
                  style={{ backgroundColor: primaryColor }}
                  type="button"
                >
                  Primary Button
                </button>
                <button
                  className="rounded-lg border px-4 py-2 font-medium text-sm"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                  type="button"
                >
                  Secondary Button
                </button>
              </div>
              <div className="flex gap-2">
                <span
                  className="rounded px-2 py-1 text-white text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Tag 1
                </span>
                <span
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Tag 2
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={isSubmitting || !isPro} onClick={handleSave}>
          {isSubmitting ? "Saving..." : "Save branding"}
        </Button>
      </div>
    </div>
  );
}
