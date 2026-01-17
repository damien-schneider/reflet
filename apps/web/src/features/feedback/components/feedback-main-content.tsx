import { ChevronUp, Edit, MoreVertical, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackMainContentProps {
  feedback: {
    title: string;
    description: string;
    voteCount: number;
    hasVoted: boolean;
    isPinned: boolean;
    _creationTime: number;
    author?: {
      name?: string | null;
      email?: string | null;
    } | null;
  };
  isAdmin: boolean;
  isEditingDescription: boolean;
  editedDescription: string;
  isSubmitting: boolean;
  handleToggleVote: () => Promise<void>;
  handleTogglePin: () => Promise<void>;
  handleDeleteFeedback: () => void;
  handleSaveDescription: () => Promise<void>;
  setEditedDescription: (value: string) => void;
  setIsEditingDescription: (value: boolean) => void;
  children?: React.ReactNode;
}

export function FeedbackMainContent({
  feedback,
  isAdmin,
  isEditingDescription,
  editedDescription,
  isSubmitting,
  handleToggleVote,
  handleTogglePin,
  handleDeleteFeedback,
  handleSaveDescription,
  setEditedDescription,
  setIsEditingDescription,
  children,
}: FeedbackMainContentProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <button
            className={`flex flex-col items-center rounded-lg border p-3 transition-colors ${
              feedback.hasVoted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary"
            }`}
            onClick={handleToggleVote}
            type="button"
          >
            <ChevronUp className="h-5 w-5" />
            <span className="font-bold text-lg">{feedback.voteCount}</span>
          </button>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h1 className="font-bold text-xl">
                {feedback.isPinned && (
                  <Pin className="mr-2 inline h-5 w-5 text-primary" />
                )}
                {feedback.title}
              </h1>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props) => (
                      <Button {...props} size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTogglePin}>
                      <Pin className="mr-2 h-4 w-4" />
                      {feedback.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDeleteFeedback}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
              <span>
                by{" "}
                {feedback.author?.name || feedback.author?.email || "Anonymous"}
              </span>
              <span>•</span>
              <span>
                {new Date(feedback._creationTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={4}
              value={editedDescription}
            />
            <div className="flex gap-2">
              <Button
                disabled={isSubmitting}
                onClick={handleSaveDescription}
                size="sm"
              >
                Save
              </Button>
              <Button
                onClick={() => setIsEditingDescription(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <p className="whitespace-pre-wrap text-muted-foreground">
              {feedback.description || "No description provided."}
            </p>
            {isAdmin && (
              <Button
                className="absolute top-0 right-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => {
                  setEditedDescription(feedback.description || "");
                  setIsEditingDescription(true);
                }}
                size="icon"
                variant="ghost"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
