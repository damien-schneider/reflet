import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AutopilotDocumentListItem = FunctionReturnType<
  typeof api.autopilot.queries.documents.listDocuments
>[number];

export type StatusPreset = "all" | "draft" | "review" | "published";
