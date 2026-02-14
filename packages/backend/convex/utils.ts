import { authComponent } from "./auth";

/**
 * Helper to get authenticated user across Convex functions
 */
export const getAuthUser = async (
  ctx: Parameters<typeof authComponent.safeGetAuthUser>[0]
) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};
