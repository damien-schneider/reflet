import { Send, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentItemProps {
  comment: {
    _id: string;
    body: string;
    author?: { name?: string; email: string; image?: string };
    _creationTime: number;
  };
  replies: Array<{
    _id: string;
    body: string;
    author?: { name?: string; email: string; image?: string };
    _creationTime: number;
  }>;
  isAdmin: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  onSubmitReply: (parentId: string) => void;
  onDeleteComment: (id: string) => void;
  isSubmitting: boolean;
}

export function CommentItem({
  comment,
  replies,
  isAdmin,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onDeleteComment,
  isSubmitting,
}: CommentItemProps) {
  const authorName =
    comment.author?.name || comment.author?.email || "Anonymous";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author?.image} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{authorName}</span>
              <span className="text-muted-foreground text-xs">
                {new Date(comment._creationTime).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setReplyingTo(comment._id)}
                size="sm"
                variant="ghost"
              >
                Reply
              </Button>
              {isAdmin && (
                <Button
                  className="h-8 w-8"
                  onClick={() => onDeleteComment(comment._id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm">{comment.body}</p>

          {/* Reply form */}
          {replyingTo === comment._id && (
            <div className="mt-3 flex gap-2">
              <Textarea
                className="flex-1"
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                value={replyContent}
              />
              <div className="flex flex-col gap-1">
                <Button
                  disabled={!replyContent.trim() || isSubmitting}
                  onClick={() => onSubmitReply(comment._id)}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setReplyingTo(null)}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 pl-4">
          {replies.map((reply) => {
            const replyAuthor =
              reply.author?.name || reply.author?.email || "Anonymous";
            const replyInitials = replyAuthor
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div className="flex gap-3" key={reply._id}>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={reply.author?.image} />
                  <AvatarFallback className="text-xs">
                    {replyInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{replyAuthor}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(reply._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                    {isAdmin && (
                      <Button
                        className="h-6 w-6"
                        onClick={() => onDeleteComment(reply._id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{reply.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
