import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

export interface FeedbackTag {
  _id: Id<"tags">;
  name: string;
  color: string;
  icon?: string;
}
