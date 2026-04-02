"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { createContext, use } from "react";

interface AutopilotContextValue {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export const AutopilotContext = createContext<AutopilotContextValue | null>(
  null
);

export function useAutopilotContext(): AutopilotContextValue {
  const context = use(AutopilotContext);
  if (!context) {
    throw new Error(
      "useAutopilotContext must be used within an AutopilotProvider"
    );
  }
  return context;
}
