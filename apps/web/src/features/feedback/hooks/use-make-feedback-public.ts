import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

export function useMakeFeedbackPublic(feedbackId: Id<"feedback">) {
  const updateFeedback = useMutation(api.feedback.mutations.update);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const makePublic = useCallback(async () => {
    setIsMakingPublic(true);
    try {
      await updateFeedback({ id: feedbackId, isApproved: true });
      toast.success("Feedback is now public");
    } catch {
      toast.error("Failed to make feedback public");
    } finally {
      setIsMakingPublic(false);
    }
  }, [feedbackId, updateFeedback]);

  return { isMakingPublic, makePublic };
}
