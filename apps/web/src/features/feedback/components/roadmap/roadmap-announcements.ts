import type { FeedbackItem } from "../feed-feedback-view";

export const createAnnouncements = (
  feedback: FeedbackItem[],
  statuses: Array<{ _id: string; name: string; color: string }>
) => ({
  onDragStart({ active }: { active: { id: string | number } }) {
    const item = feedback.find((f) => f._id === active.id);
    return `Picked up ${item?.title}. Dragging.`;
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
  onDragEnd({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) {
    const item = feedback.find((f) => f._id === active.id);
    const status = statuses.find((s) => s._id === over?.id);
    return status
      ? `Dropped ${item?.title} in ${status.name}`
      : "Drag cancelled";
  },
  onDragCancel: () => "Drag cancelled",
});
