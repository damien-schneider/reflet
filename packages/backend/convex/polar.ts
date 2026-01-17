import { Polar } from "@convex-dev/polar";
import type { FunctionReference } from "convex/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

// Create a typed function reference for the internal getCurrentUser query
// This avoids circular dependency issues by not importing from internal
const getCurrentUserRef =
  "polar_user:getCurrentUser" as unknown as FunctionReference<
    "query",
    "internal",
    Record<string, never>,
    { _id: string; email: string } | null
  >;

/**
 * Polar client for managing subscriptions and billing
 *
 * Environment variables required:
 * - POLAR_ORGANIZATION_TOKEN: Your Polar organization token
 * - POLAR_WEBHOOK_SECRET: Your Polar webhook secret
 * - POLAR_SERVER: "sandbox" or "production" (optional, defaults to "production")
 *
 * Products configuration:
 * - proMonthly: Monthly Pro subscription
 * - proYearly: Yearly Pro subscription (optional)
 *
 * Set product IDs via environment variables or directly here after creating them in Polar dashboard
 */
export const polar = new Polar<
  DataModel,
  { proMonthly: string; proYearly: string }
>(components.polar, {
  // Get user info for subscription lookups
  // This uses runQuery to call the internal getCurrentUser query to get auth context
  getUserInfo: async (ctx) => {
    const user = await ctx.runQuery(getCurrentUserRef);
    if (!user) {
      throw new Error("User not authenticated");
    }
    return {
      userId: user._id,
      email: user.email,
    };
  },
  // Product key mapping - update with actual Polar product IDs
  // These should be set via environment variables in production:
  // POLAR_PRODUCT_PRO_MONTHLY, POLAR_PRODUCT_PRO_YEARLY
  products: {
    proMonthly: process.env.POLAR_PRODUCT_PRO_MONTHLY ?? "pro_monthly_id",
    proYearly: process.env.POLAR_PRODUCT_PRO_YEARLY ?? "pro_yearly_id",
  },
  // Server configuration (sandbox for development, production for live)
  // Falls back to POLAR_SERVER env var
});

// Export API functions from the Polar client
export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
