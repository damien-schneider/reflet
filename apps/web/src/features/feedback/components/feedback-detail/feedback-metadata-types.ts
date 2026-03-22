import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface FeedbackTag {
  _id: Id<"tags">;
  appliedByAi?: boolean;
  color: string;
  icon?: string;
  name: string;
}
