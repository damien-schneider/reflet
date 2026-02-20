"use client";

import { ChatText, Check, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { ComponentType } from "react";
import { use, useEffect, useRef, useState } from "react";
import {
  EditorialFeedPreview,
  MinimalNotchPreview,
  SweepCornerPreview,
} from "@/components/docs/feedback-card-previews";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Text } from "@/components/ui/typography";
import {
  CARD_STYLE_OPTIONS,
  type CardStyle,
  DEFAULT_CARD_STYLE,
} from "@/features/feedback/lib/card-styles";
import { cn } from "@/lib/utils";

const PREVIEW_COMPONENTS: Record<CardStyle, ComponentType> = {
  "minimal-notch": MinimalNotchPreview,
  "sweep-corner": SweepCornerPreview,
  "editorial-feed": EditorialFeedPreview,
};

const AUTOSAVE_DEBOUNCE_MS = 800;

export default function FeedbackSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const updateOrg = useMutation(api.organizations.update);

  const [cardStyle, setCardStyle] = useState<CardStyle>(DEFAULT_CARD_STYLE);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  // Sync cardStyle from org settings using render-time state update pattern
  const orgCardStyle = org?.feedbackSettings?.cardStyle;
  const [lastSyncedStyle, setLastSyncedStyle] = useState<string | undefined>(
    undefined
  );
  if (orgCardStyle !== lastSyncedStyle) {
    setLastSyncedStyle(orgCardStyle);
    if (orgCardStyle) {
      setCardStyle(orgCardStyle);
    }
  }

  const save = async (style: CardStyle) => {
    if (!(org?._id && isAdmin)) {
      return;
    }
    setSaveStatus("saving");
    try {
      await updateOrg({
        id: org._id,
        feedbackSettings: {
          ...org.feedbackSettings,
          cardStyle: style,
        },
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

  const handleStyleChange = (style: CardStyle) => {
    setCardStyle(style);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      save(style);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const PreviewComponent = PREVIEW_COMPONENTS[cardStyle];

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Text>Loading...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ChatText className="h-8 w-8 text-muted-foreground" />
          <div>
            <H1>Feedback Display</H1>
            <Text variant="bodySmall">
              Choose how feedback cards appear on your board
            </Text>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Card Style</CardTitle>
            <CardDescription>
              Select a visual style for feedback cards. This applies to both
              your dashboard and public board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {CARD_STYLE_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    cardStyle === option.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-border/80 hover:bg-accent/30",
                    !isAdmin && "pointer-events-none opacity-60"
                  )}
                  disabled={!isAdmin}
                  key={option.value}
                  onClick={() => handleStyleChange(option.value)}
                  type="button"
                >
                  <div className="mb-1 font-semibold text-sm">
                    {option.label}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Interactive preview of the selected card style. Click the vote
              buttons to see animations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/30 bg-background p-3">
              <PreviewComponent />
            </div>
          </CardContent>
        </Card>

        {saveStatus !== "idle" && (
          <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm">
            {saveStatus === "saving" && (
              <>
                <Spinner className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
