export interface CommentData {
  id: string;
  content: string;
  createdAt: number;
  author?: {
    name?: string;
    email?: string;
    image?: string;
  };
  replies: CommentData[];
}
