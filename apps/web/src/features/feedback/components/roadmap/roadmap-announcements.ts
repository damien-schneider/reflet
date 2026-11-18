import type { FeedbackItem } from "../feed-feedback-view";

const UNKNOWN_ITEM_LABEL = "item";

export const createAnnouncements = (
  feedback: FeedbackItem[],
  statuses: Array<{ _id: string; name: string; color: string }>
) => {
  const titleOf = (id: string | number): string =>
    feedback.find((f) => f._id === id)?.title ?? UNKNOWN_ITEM_LABEL;

  return {
    onDragCancel: () => "Drag cancelled",
    onDragEnd({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      const status = statuses.find((s) => s._id === over?.id);
      return status
        ? `Dropped ${titleOf(active.id)} in ${status.name}`
        : "Drag cancelled";
    },
    onDragOver({
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      const status = statuses.find((s) => s._id === over?.id);
      return status ? `Over ${status.name} column` : undefined;
    },
    onDragStart({ active }: { active: { id: string | number } }) {
      return `Picked up ${titleOf(active.id)}. Dragging.`;
    },
  };
};
