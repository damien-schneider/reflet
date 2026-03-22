import type { Id } from "@reflet/backend/convex/_generated/dataModel";

export interface CommentData {
  author?: {
    name?: string;
    email?: string;
    image?: string;
  };
  content: string;
  createdAt: number;
  id: Id<"comments">;
  replies: CommentData[];
}
