import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface FeedbackTag {
  _id: Id<"tags">;
  name: string;
  color: string;
  icon?: string;
  appliedByAi?: boolean;
}
