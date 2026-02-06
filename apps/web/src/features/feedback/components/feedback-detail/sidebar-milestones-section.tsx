"use client";

import { Flag, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDeadlineColor, getDeadlineInfo } from "@/lib/milestone-deadline";
import { getTagColorValues } from "@/lib/tag-colors";

interface SidebarMilestonesSectionProps {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

export function SidebarMilestonesSection({
  feedbackId,
  organizationId,
  isAdmin,
}: SidebarMilestonesSectionProps) {
  const linkedMilestones = useQuery(api.milestones.listByFeedback, {
    feedbackId,
  });

  const allMilestones = useQuery(api.milestones.list, {
    organizationId,
  });

  const addFeedback = useMutation(api.milestones.addFeedback);
  const removeFeedback = useMutation(api.milestones.removeFeedback);

  const handleAdd = useCallback(
    async (milestoneId: string | null) => {
      if (!milestoneId) {
        return;
      }
      await addFeedback({
        milestoneId: milestoneId as Id<"milestones">,
        feedbackId,
      });
    },
    [feedbackId, addFeedback]
  );

  const handleRemove = useCallback(
    async (milestoneId: string) => {
      await removeFeedback({
        milestoneId: milestoneId as Id<"milestones">,
        feedbackId,
      });
    },
    [feedbackId, removeFeedback]
  );

  const validLinkedMilestones =
    linkedMilestones?.filter(
      (m): m is NonNullable<typeof m> => m !== null && m !== undefined
    ) ?? [];
  const linkedIds = new Set(validLinkedMilestones.map((m) => m._id));
  const availableMilestones =
    allMilestones?.filter((m) => !linkedIds.has(m._id)) ?? [];

  return (
    <div>
      <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Milestones
      </h4>

      {/* Linked milestones */}
      <div className="flex flex-wrap gap-1.5">
        {validLinkedMilestones.map((milestone) => {
          const colorValues = getTagColorValues(milestone.color);
          const deadlineInfo = getDeadlineInfo(
            milestone.targetDate,
            milestone.status
          );
          const deadlineColorClass = deadlineInfo
            ? getDeadlineColor(deadlineInfo.status)
            : undefined;
          return (
            <Badge
              className="group gap-1 pr-1"
              key={milestone._id}
              style={{
                backgroundColor: colorValues.bg,
                color: colorValues.text,
                borderColor: `${colorValues.text}30`,
              }}
              variant="outline"
            >
              {milestone.emoji && (
                <span className="text-xs">{milestone.emoji}</span>
              )}
              {milestone.name}
              {deadlineInfo && (
                <span
                  className={`text-[10px] opacity-80 ${deadlineColorClass}`}
                >
                  &middot; {deadlineInfo.relativeLabel}
                </span>
              )}
              {isAdmin && (
                <button
                  className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemove(milestone._id)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}
        {validLinkedMilestones.length === 0 && (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Flag className="h-3 w-3" />
            No milestones
          </span>
        )}
      </div>

      {/* Add milestone select (admin only) */}
      {isAdmin && availableMilestones.length > 0 && (
        <div className="mt-2">
          <Select onValueChange={handleAdd}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Add to milestone..." />
            </SelectTrigger>
            <SelectContent>
              {availableMilestones.map((m) => {
                const colorValues = getTagColorValues(m.color);
                return (
                  <SelectItem key={m._id} value={m._id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorValues.text }}
                      />
                      {m.emoji && <span className="text-xs">{m.emoji}</span>}
                      {m.name}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
