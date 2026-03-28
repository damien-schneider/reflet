"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { createContext, use } from "react";

interface ProjectContextValue {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext(): ProjectContextValue {
  const context = use(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
