import { internalQuery } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Get current authenticated user for Polar getUserInfo
 * This is used internally by the Polar component to get user info
 * Separated into its own file to avoid circular dependencies
 *
 * This is an internal query so it can only be called from within Convex
 */
export const getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
    };
  },
});
