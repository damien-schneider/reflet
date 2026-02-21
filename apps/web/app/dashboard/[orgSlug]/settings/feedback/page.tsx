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
  DashboardTimelinePreview,
  EditorialAccordionPreview,
  TrackViewPreview,
} from "@/components/docs/milestone-view-previews";
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
import {
  DEFAULT_MILESTONE_VIEW_STYLE,
  MILESTONE_VIEW_STYLE_OPTIONS,
  type MilestoneViewStyle,
} from "@/features/milestones/lib/view-styles";
import { cn } from "@/lib/utils";

const CARD_PREVIEW_COMPONENTS: Record<CardStyle, ComponentType> = {
  "minimal-notch": MinimalNotchPreview,
  "sweep-corner": SweepCornerPreview,
  "editorial-feed": EditorialFeedPreview,
};

const MILESTONE_PREVIEW_COMPONENTS: Record<MilestoneViewStyle, ComponentType> =
  {
    track: TrackViewPreview,
    "editorial-accordion": EditorialAccordionPreview,
    "dashboard-timeline": DashboardTimelinePreview,
  };

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

  const updateOrg = useMutation(api.organizations.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.organizations.getBySlug, {
        slug: orgSlug,
      });
      if (!current) {
        return;
      }
      localStore.setQuery(
        api.organizations.getBySlug,
        { slug: orgSlug },
        {
          ...current,
          feedbackSettings: {
            ...current.feedbackSettings,
            ...args.feedbackSettings,
          },
        }
      );
    }
  );

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  // Derive styles directly from org query (optimistic updates make this instant)
  const cardStyle: CardStyle =
    org?.feedbackSettings?.cardStyle ?? DEFAULT_CARD_STYLE;
  const milestoneStyle: MilestoneViewStyle =
    org?.feedbackSettings?.milestoneStyle ?? DEFAULT_MILESTONE_VIEW_STYLE;

  const save = async (updates: {
    cardStyle?: CardStyle;
    milestoneStyle?: MilestoneViewStyle;
  }) => {
    if (!(org?._id && isAdmin)) {
      return;
    }
    setSaveStatus("saving");
    try {
      await updateOrg({
        id: org._id,
        feedbackSettings: {
          ...org.feedbackSettings,
          ...updates,
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

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const CardPreviewComponent = CARD_PREVIEW_COMPONENTS[cardStyle];
  const MilestonePreviewComponent =
    MILESTONE_PREVIEW_COMPONENTS[milestoneStyle];

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
              Choose how feedback cards and milestones appear on your board
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
                  onClick={() => save({ cardStyle: option.value })}
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
              <CardPreviewComponent />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone View</CardTitle>
            <CardDescription>
              Choose how the milestones timeline appears on your board. This
              applies to both your dashboard and public board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {MILESTONE_VIEW_STYLE_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    milestoneStyle === option.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-border/80 hover:bg-accent/30",
                    !isAdmin && "pointer-events-none opacity-60"
                  )}
                  disabled={!isAdmin}
                  key={option.value}
                  onClick={() => save({ milestoneStyle: option.value })}
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
            <CardTitle>Milestone Preview</CardTitle>
            <CardDescription>
              Interactive preview of the selected milestone view. Click
              milestones to see expansion and animations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/30 bg-background p-3">
              <MilestonePreviewComponent />
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
