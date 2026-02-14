import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface CommentData {
  id: Id<"comments">;
  content: string;
  createdAt: number;
  author?: {
    name?: string;
    email?: string;
    image?: string;
  };
  replies: CommentData[];
}
