import { v } from "convex/values";

/** `untriaged` skips feedback the AI already analysed; `all` re-runs everything. */
export const triageScopeValidator = v.union(
  v.literal("untriaged"),
  v.literal("all")
);
