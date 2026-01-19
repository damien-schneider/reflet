import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

/**
 * Check if a user with the given email already exists
 * This is used for the unified auth form to determine
 * whether to show sign-in or sign-up fields
 */
export const checkEmailExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // Normalize email to lowercase for consistent checking
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      return { exists: false };
    }

    // Query Better Auth's user table directly via the component
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "email",
          operator: "eq",
          value: normalizedEmail,
        },
      ],
    });

    return {
      exists: !!user,
    };
  },
});
