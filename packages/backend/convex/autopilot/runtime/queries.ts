import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "../queries/auth";
import { buildRuntimeState } from "./state";
import { runtimeStateValidator } from "./view";

export const getRuntimeState = query({
  args: {
    organizationId: v.id("organizations"),
    baseUrl: v.string(),
  },
  returns: runtimeStateValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    return await buildRuntimeState(ctx, args.organizationId, args.baseUrl);
  },
});

export const getRuntimeStateInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    baseUrl: v.string(),
  },
  returns: runtimeStateValidator,
  handler: async (ctx, args) =>
    await buildRuntimeState(ctx, args.organizationId, args.baseUrl),
});
