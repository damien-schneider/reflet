import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

export function useMakeFeedbackPublic(feedbackId: Id<"feedback">) {
  const updateFeedback = useMutation(api.feedback.publication.setState);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const makePublic = async () => {
    setIsMakingPublic(true);
    try {
      await updateFeedback({ feedbackId, state: "approved" });
      toast.success("Feedback approved for publication");
    } catch {
      toast.error("Failed to make feedback public");
    }
    setIsMakingPublic(false);
  };

  return { isMakingPublic, makePublic };
}
