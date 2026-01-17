import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackDetailDialogsProps {
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  handleDeleteFeedback: () => void;
  commentToDelete: string | null;
  setCommentToDelete: (id: string | null) => void;
  handleDeleteComment: () => void;
}

export function FeedbackDetailDialogs({
  showDeleteDialog,
  setShowDeleteDialog,
  handleDeleteFeedback,
  commentToDelete,
  setCommentToDelete,
  handleDeleteComment,
}: FeedbackDetailDialogsProps) {
  return (
    <>
      {/* Delete Feedback Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? All votes and
              comments will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDeleteFeedback} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Comment Dialog */}
      <Dialog
        onOpenChange={() => setCommentToDelete(null)}
        open={!!commentToDelete}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCommentToDelete(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteComment} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
