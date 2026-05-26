import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "../mutations/auth";
import {
  deleteAutopilotResetData,
  getAutopilotResetScope,
  resetScopeGroup,
} from "./scope";

export const getResetScope = query({
  args: {},
  returns: v.array(resetScopeGroup),
  handler: getAutopilotResetScope,
});

export const resetAllData = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    await deleteAutopilotResetData(ctx, args.organizationId);

    return null;
  },
});
