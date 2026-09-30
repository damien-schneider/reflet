"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ctrl-ui/react/ui/context-menu";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type ReactNode, useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

interface FeedbackDeleteMenuProps {
  canDelete: boolean;
  children: ReactNode;
  feedbackId: Id<"feedback">;
}

export function FeedbackDeleteMenu({
  canDelete,
  children,
  feedbackId,
}: FeedbackDeleteMenuProps) {
  const deleteFeedback = useMutation(api.feedback.actions.remove);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteFeedback({ id: feedbackId });
    } catch {
      toast.error("Couldn’t move this feedback to trash. Try again.");
    }
  };

  if (!canDelete) {
    return children;
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="menu-item-danger"
            onClick={() => setIsConfirmOpen(true)}
          >
            <Trash aria-hidden data-icon="inline-start" />
            Move to trash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <DestructiveConfirmDialog
        confirmLabel="Move to trash"
        description="It disappears from the board, with its comments and votes. You can restore it from the trash within 30 days."
        onConfirm={handleDelete}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title="Move feedback to trash?"
      />
    </>
  );
}
