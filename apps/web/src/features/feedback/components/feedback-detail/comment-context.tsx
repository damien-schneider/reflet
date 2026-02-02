"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createContext, type ReactNode, useContext } from "react";

interface CommentContextValue {
  feedbackId: Id<"feedback">;
}

const CommentContext = createContext<CommentContextValue | null>(null);

interface CommentProviderProps {
  feedbackId: Id<"feedback">;
  children: ReactNode;
}

export function CommentProvider({
  feedbackId,
  children,
}: CommentProviderProps) {
  return (
    <CommentContext.Provider value={{ feedbackId }}>
      {children}
    </CommentContext.Provider>
  );
}

export function useFeedbackId(): Id<"feedback"> {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error("useFeedbackId must be used within a CommentProvider");
  }
  return context.feedbackId;
}
