import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type FeedbackDetail = NonNullable<
  FunctionReturnType<typeof api.feedback.queries.get>
>;
