import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Deliberately enumerable: the unified auth form needs to know whether to show
 * sign-in or sign-up fields before the password is typed. Hiding it would only
 * move the signal to the sign-in error message.
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
