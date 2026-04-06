import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

import type { TimeHorizon } from "@/lib/milestone-constants";
import type { TagColor } from "@/lib/tag-colors";
import { isValidTagColor } from "@/lib/tag-colors";

interface MilestoneEditData {
  _id: Id<"milestones">;
  color: string;
  emoji?: string;
  name: string;
  status: string;
  targetDate?: number;
  timeHorizon: TimeHorizon;
}

export function useMilestoneEdit(milestone: MilestoneEditData) {
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(milestone.name);
  const [editEmoji, setEditEmoji] = useState<string | undefined>(
    milestone.emoji
  );
  const [editColor, setEditColor] = useState<TagColor>(
    isValidTagColor(milestone.color) ? milestone.color : "default"
  );
  const [editHorizon, setEditHorizon] = useState<TimeHorizon>(
    milestone.timeHorizon
  );
  const [editTargetDate, setEditTargetDate] = useState<number | undefined>(
    milestone.targetDate
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateMilestone = useMutation(
    api.organizations.milestones_mutations.update
  );
  const removeMilestone = useMutation(
    api.organizations.milestones_mutations.remove
  );

  const handleEditOpen = useCallback(() => {
    setEditName(milestone.name);
    setEditEmoji(milestone.emoji);
    setEditColor(
      isValidTagColor(milestone.color) ? milestone.color : "default"
    );
    setEditHorizon(milestone.timeHorizon);
    setEditTargetDate(milestone.targetDate);
    setEditOpen(true);
  }, [
    milestone.name,
    milestone.emoji,
    milestone.color,
    milestone.timeHorizon,
    milestone.targetDate,
  ]);

  const handleEditSubmit = useCallback(async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dateCleared =
        milestone.targetDate !== undefined && editTargetDate === undefined;
      let dateUpdate: { clearTargetDate?: true; targetDate?: number } = {};
      if (dateCleared) {
        dateUpdate = { clearTargetDate: true };
      } else if (editTargetDate !== undefined) {
        dateUpdate = { targetDate: editTargetDate };
      }
      await updateMilestone({
        id: milestone._id,
        name: trimmedName,
        emoji: editEmoji,
        color: editColor,
        timeHorizon: editHorizon,
        ...dateUpdate,
      });
      setEditOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editName,
    editEmoji,
    editColor,
    editHorizon,
    editTargetDate,
    milestone._id,
    milestone.targetDate,
    updateMilestone,
  ]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      }
    },
    [handleEditSubmit]
  );

  const handleComplete = useCallback(async () => {
    await updateMilestone({
      id: milestone._id,
      status: "completed",
    });
  }, [milestone._id, updateMilestone]);

  const handleDelete = useCallback(async () => {
    await removeMilestone({ id: milestone._id });
  }, [milestone._id, removeMilestone]);

  return {
    editColor,
    editEmoji,
    editHorizon,
    editName,
    editOpen,
    editTargetDate,
    handleComplete,
    handleDelete,
    handleEditKeyDown,
    handleEditOpen,
    handleEditSubmit,
    isCompleted: milestone.status === "completed",
    isSubmitting,
    setEditColor,
    setEditEmoji,
    setEditHorizon,
    setEditName,
    setEditOpen,
    setEditTargetDate,
  };
}
