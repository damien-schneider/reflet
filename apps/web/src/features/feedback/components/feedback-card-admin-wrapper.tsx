"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ctrl-ui/react/ui/context-menu";
import { Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type ReactNode, useCallback, useState } from "react";

import { useFeedbackBoard } from "./feedback-board/feedback-board-context";

interface FeedbackCardAdminWrapperProps {
  children: ReactNode;
  feedbackId: Id<"feedback">;
}

export function FeedbackCardAdminWrapper({
  feedbackId,
  children,
}: FeedbackCardAdminWrapperProps) {
  const { isAdmin } = useFeedbackBoard();
  const deleteFeedback = useMutation(api.feedback.actions.remove);
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
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="menu-item-danger"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={handleDelete}
              tone="danger"
              variant="surface"
            >
              Move to trash
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
