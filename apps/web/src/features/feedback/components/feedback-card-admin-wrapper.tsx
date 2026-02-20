"use client";

import { Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type ReactNode, useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextList,
  ContextListContent,
  ContextListItem,
  ContextListTrigger,
} from "@/components/ui/context-menu";

import { useFeedbackBoard } from "./feedback-board/feedback-board-context";

interface FeedbackCardAdminWrapperProps {
  feedbackId: Id<"feedback">;
  children: ReactNode;
}

export function FeedbackCardAdminWrapper({
  feedbackId,
  children,
}: FeedbackCardAdminWrapperProps) {
  const { isAdmin } = useFeedbackBoard();
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = useCallback(async () => {
    await deleteFeedback({ id: feedbackId });
    setShowDeleteDialog(false);
  }, [feedbackId, deleteFeedback]);

  if (!isAdmin) {
    return children;
  }

  return (
    <>
      <ContextList>
        <ContextListTrigger>{children}</ContextListTrigger>
        <ContextListContent>
          <ContextListItem
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </ContextListItem>
        </ContextListContent>
      </ContextList>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback</AlertDialogTitle>
            <AlertDialogDescription>
              This feedback will be moved to trash. You can restore it within 30
              days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
