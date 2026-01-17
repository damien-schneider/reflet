import { Link } from "@tanstack/react-router";
import {
  ChevronUp,
  MessageSquare,
  MoreVertical,
  Pin,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedbackCardProps {
  feedback: {
    _id: string;
    title: string;
    description?: string;
    voteCount: number;
    hasVoted: boolean;
    isPinned: boolean;
    commentCount: number;
    tags?: { _id: string; name: string; color: string }[];
    author?: { name?: string; email: string };
    _creationTime: number;
  };
  isAdmin: boolean;
  onToggleVote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: () => void;
  orgSlug: string;
  boardSlug: string;
}

export function FeedbackCard({
  feedback,
  isAdmin,
  onToggleVote,
  onTogglePin,
  onDelete,
  orgSlug,
  boardSlug,
}: FeedbackCardProps) {
  return (
    <Card className="transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <button
            className={`flex flex-col items-center rounded-lg border p-2 transition-colors ${
              feedback.hasVoted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary"
            }`}
            onClick={() => onToggleVote(feedback._id)}
            type="button"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="font-semibold text-sm">{feedback.voteCount}</span>
          </button>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  className="font-semibold transition-colors hover:text-primary hover:underline"
                  params={{
                    orgSlug,
                    boardSlug,
                    feedbackId: feedback._id,
                  }}
                  to="/dashboard/$orgSlug/boards/$boardSlug/feedback/$feedbackId"
                >
                  {feedback.isPinned && (
                    <Pin className="mr-1 inline h-4 w-4 text-primary" />
                  )}
                  {feedback.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {feedback.tags?.map((tag) => (
                    <Badge
                      className="text-white"
                      key={tag._id}
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        className="h-8 w-8"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTogglePin(feedback._id)}>
                      <Pin className="mr-2 h-4 w-4" />
                      {feedback.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {feedback.description && (
              <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                {feedback.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {feedback.commentCount}
              </span>
              <span>
                {feedback.author?.name || feedback.author?.email || "Anonymous"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
