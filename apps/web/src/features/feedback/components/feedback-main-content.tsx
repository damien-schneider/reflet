import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent, CardHeader } from "@ctrl-ui/react/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import {
  CaretUp,
  DotsThreeVertical,
  Pencil,
  PushPin,
  Trash,
} from "@phosphor-icons/react";
import type * as React from "react";
import { H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface FeedbackMainContentProps {
  children?: React.ReactNode;
  editedDescription: string;
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
  handleDeleteFeedback: () => void;
  handleSaveDescription: () => Promise<void>;
  handleTogglePin: () => Promise<void>;
  handleToggleVote: () => Promise<void>;
  isAdmin: boolean;
  isEditingDescription: boolean;
  isSubmitting: boolean;
  setEditedDescription: (value: string) => void;
  setIsEditingDescription: (value: boolean) => void;
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
          <Button
            aria-label={feedback.hasVoted ? "Remove vote" : "Upvote"}
            aria-pressed={feedback.hasVoted}
            className={cn(
              "h-auto flex-col rounded-lg border p-3 transition-colors",
              feedback.hasVoted
                ? "border-brand bg-brand-subtle text-brand-text"
                : "border-border hover:border-brand"
            )}
            onClick={handleToggleVote}
            variant="quiet"
          >
            <CaretUp className="h-5 w-5" />
            <span className="font-bold text-lg tabular-nums">
              {feedback.voteCount}
            </span>
          </Button>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <H3 variant="card">
                {feedback.isPinned && (
                  <PushPin className="mr-2 inline h-5 w-5 text-brand-text" />
                )}
                {feedback.title}
              </H3>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props: React.ComponentProps<"button">) => (
                      <Button {...props} iconOnly variant="ghost">
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTogglePin}>
                      <PushPin className="mr-2 h-4 w-4" />
                      {feedback.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="menu-item-danger"
                      onClick={handleDeleteFeedback}
                    >
                      <Trash className="mr-2 h-4 w-4" />
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
                size="xs"
                tone="primary"
                variant="solid"
              >
                Save
              </Button>
              <Button
                onClick={() => setIsEditingDescription(false)}
                size="xs"
                variant="surface"
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
                aria-label="Edit description"
                className="pointer-fine:pointer-events-none absolute top-0 right-0 pointer-fine:opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                iconOnly
                onClick={() => {
                  setEditedDescription(feedback.description || "");
                  setIsEditingDescription(true);
                }}
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
