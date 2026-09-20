"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, PaintBrush, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MILESTONE_VIEW_STYLE,
  MILESTONE_VIEW_STYLE_OPTIONS,
  type MilestoneViewStyle,
} from "@/features/milestones/lib/view-styles";
import { cn } from "@/lib/utils";
import {
  CARD_STYLE_OPTIONS,
  type CardStyle,
  DEFAULT_CARD_STYLE,
} from "../lib/card-styles";

interface BoardCustomizePopoverProps {
  orgSlug: string;
}

export function BoardCustomizePopover({ orgSlug }: BoardCustomizePopoverProps) {
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const updateOrg = useMutation(
    api.organizations.mutations.update
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.organizations.queries.getBySlug, {
      slug: orgSlug,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.organizations.queries.getBySlug,
      { slug: orgSlug },
      {
        ...current,
        feedbackSettings: {
          ...current.feedbackSettings,
          ...args.feedbackSettings,
        },
      }
    );
  });

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const cardStyle: CardStyle =
    org?.feedbackSettings?.cardStyle ?? DEFAULT_CARD_STYLE;
  const milestoneStyle: MilestoneViewStyle =
    org?.feedbackSettings?.milestoneStyle ?? DEFAULT_MILESTONE_VIEW_STYLE;

  const save = async (updates: {
    cardStyle?: CardStyle;
    milestoneStyle?: MilestoneViewStyle;
  }) => {
    if (!org?._id) {
      return;
    }
    setSaveStatus("saving");
    try {
      await updateOrg({ feedbackSettings: updates, id: org._id });
      setSaveStatus("saved");
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("idle");
    }
  };

  useEffect(
    () => () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    },
    []
  );

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          aria-label="Customize appearance"
          render={
            <PopoverTrigger
              render={
                <Button
                  className="h-8 w-8 text-muted-foreground"
                  iconOnly
                  variant="ghost"
                />
              }
            />
          }
        >
          <PaintBrush className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>Customize appearance</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Customize Board</PopoverTitle>
          <PopoverDescription>
            Changes apply instantly to the board.
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Card Style
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {CARD_STYLE_OPTIONS.map((option) => (
              <Button
                className={cn(
                  "h-auto rounded-lg border px-2 py-2 text-center text-xs transition-[background-color,border-color,box-shadow,color]",
                  cardStyle === option.value
                    ? "border-primary bg-primary/5 font-medium text-foreground shadow-sm"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                key={option.value}
                onClick={() => save({ cardStyle: option.value })}
                variant="quiet"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Milestone View
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {MILESTONE_VIEW_STYLE_OPTIONS.map((option) => (
              <Button
                className={cn(
                  "h-auto rounded-lg border px-2 py-2 text-center text-xs transition-[background-color,border-color,box-shadow,color]",
                  milestoneStyle === option.value
                    ? "border-primary bg-primary/5 font-medium text-foreground shadow-sm"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                key={option.value}
                onClick={() => save({ milestoneStyle: option.value })}
                variant="quiet"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {saveStatus !== "idle" && (
          <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-xs">
            {saveStatus === "saving" && (
              <>
                <Spinner className="h-3 w-3 animate-spin" />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
