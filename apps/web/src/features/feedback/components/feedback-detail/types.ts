import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

// ============================================
// TYPES
// ============================================

export interface FeedbackDetailProps {
  feedbackId: Id<"feedback"> | null;
  onClose: () => void;
  isMember?: boolean;
  isAdmin?: boolean;
}

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

export interface CommentItemProps {
  feedbackId: Id<"feedback">;
  comment: CommentData;
}

// ============================================
// CONSTANTS
// ============================================

export const IMPORTANCE_LEVELS = [
  { emoji: "😬", label: "Not important", value: 1 },
  { emoji: "🥱", label: "Nice to have", value: 2 },
  { emoji: "😃", label: "Important", value: 3 },
  { emoji: "🤩", label: "Essential", value: 4 },
] as const;

export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
export type ImportanceValue = ImportanceLevel["value"];
