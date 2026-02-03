#!/usr/bin/env npx tsx

/**
 * Stripe Setup Verification Script
 *
 * This script verifies that Stripe is properly configured for the Reflet application.
 * Run this before `bun run convex deploy` to ensure billing will work correctly.
 *
 * Usage:
 *   npx tsx scripts/verify-stripe-setup.ts
 *   bun run scripts/verify-stripe-setup.ts
 *
 * Required environment variables (in Convex dashboard):
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_WEBHOOK_SECRET
 *   - STRIPE_PRICE_PRO_MONTHLY
 *   - STRIPE_PRICE_PRO_YEARLY
 */

import Stripe from "stripe";

const EXPECTED_PRICES = {
  proMonthly: {
    amount: 2900, // €29.00
    currency: "eur",
    interval: "month",
  },
  proYearly: {
    amount: 29_000, // €290.00
    currency: "eur",
    interval: "year",
  },
} as const;

interface VerificationResult {
  success: boolean;
  message: string;
  details?: string;
}

async function verifyStripeKey(stripe: Stripe): Promise<VerificationResult> {
  try {
    // Try to list customers (limited to 1) to verify the key works
    await stripe.customers.list({ limit: 1 });
    return { success: true, message: "Stripe API key is valid" };
  } catch (error) {
    return {
      success: false,
      message: "Stripe API key is invalid or missing",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyPrice(
  stripe: Stripe,
  priceId: string,
  expected: (typeof EXPECTED_PRICES)[keyof typeof EXPECTED_PRICES],
  name: string
): Promise<VerificationResult> {
  if (!priceId) {
    return {
      success: false,
      message: `${name} price ID is not set`,
      details: `Set STRIPE_PRICE_${name.toUpperCase().replace(" ", "_")} environment variable`,
    };
  }

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });

    const errors: string[] = [];

    if (!price.active) {
      errors.push("Price is not active");
    }

    if (price.unit_amount !== expected.amount) {
      errors.push(
        `Expected amount ${expected.amount}, got ${price.unit_amount}`
      );
    }

    if (price.currency !== expected.currency) {
      errors.push(
        `Expected currency ${expected.currency}, got ${price.currency}`
      );
    }

    if (price.recurring?.interval !== expected.interval) {
      errors.push(
        `Expected interval ${expected.interval}, got ${price.recurring?.interval}`
      );
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `${name} price configuration mismatch`,
        details: errors.join("; "),
      };
    }

    const product = price.product as Stripe.Product;
    const currencySymbol = price.currency === "eur" ? "€" : "$";
    return {
      success: true,
      message: `${name} price verified: ${product.name} - ${currencySymbol}${(price.unit_amount ?? 0) / 100}/${price.recurring?.interval}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `${name} price not found: ${priceId}`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyWebhook(
  stripe: Stripe,
  expectedPath: string
): Promise<VerificationResult> {
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 });

    const matchingWebhook = webhooks.data.find((wh) =>
      wh.url.includes(expectedPath)
    );

    if (!matchingWebhook) {
      return {
        success: false,
        message: "No webhook endpoint found for /stripe/webhook",
        details:
          "Create a webhook at https://dashboard.stripe.com/webhooks with endpoint URL: https://your-deployment.convex.site/stripe/webhook",
      };
    }

    if (matchingWebhook.status !== "enabled") {
      return {
        success: false,
        message: "Webhook endpoint is not enabled",
        details: `Status: ${matchingWebhook.status}`,
      };
    }

    const requiredEvents = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ];

    const missingEvents = requiredEvents.filter(
      (event) => !matchingWebhook.enabled_events.includes(event)
    );

    if (missingEvents.length > 0) {
      return {
        success: false,
        message: "Webhook is missing required events",
        details: `Missing: ${missingEvents.join(", ")}`,
      };
    }

    return {
      success: true,
      message: `Webhook configured: ${matchingWebhook.url}`,
      details: `Events: ${matchingWebhook.enabled_events.length} configured`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to verify webhook configuration",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("\n🔍 Verifying Stripe Setup for Reflet\n");
  console.log("=".repeat(50));

  // Get environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const priceYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const results: VerificationResult[] = [];

  // Check for required environment variables
  if (!stripeSecretKey) {
    console.log("\n❌ STRIPE_SECRET_KEY is not set");
    console.log(
      "   Run: npx convex env set STRIPE_SECRET_KEY 'sk_test_...' or set it locally"
    );
    console.log("\nTo run this script with local env vars:");
    console.log(
      "   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/verify-stripe-setup.ts\n"
    );
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  // 1. Verify API key
  console.log("\n1. Verifying Stripe API Key...");
  const keyResult = await verifyStripeKey(stripe);
  results.push(keyResult);
  console.log(
    keyResult.success
      ? `   ✅ ${keyResult.message}`
      : `   ❌ ${keyResult.message}`
  );
  if (keyResult.details) {
    console.log(`      ${keyResult.details}`);
  }

  if (!keyResult.success) {
    console.log("\n❌ Cannot continue without valid API key\n");
    process.exit(1);
  }

  // 2. Verify Pro Monthly price
  console.log("\n2. Verifying Pro Monthly Price...");
  const monthlyResult = await verifyPrice(
    stripe,
    priceMonthly ?? "",
    EXPECTED_PRICES.proMonthly,
    "Pro Monthly"
  );
  results.push(monthlyResult);
  console.log(
    monthlyResult.success
      ? `   ✅ ${monthlyResult.message}`
      : `   ❌ ${monthlyResult.message}`
  );
  if (monthlyResult.details) {
    console.log(`      ${monthlyResult.details}`);
  }

  // 3. Verify Pro Yearly price
  console.log("\n3. Verifying Pro Yearly Price...");
  const yearlyResult = await verifyPrice(
    stripe,
    priceYearly ?? "",
    EXPECTED_PRICES.proYearly,
    "Pro Yearly"
  );
  results.push(yearlyResult);
  console.log(
    yearlyResult.success
      ? `   ✅ ${yearlyResult.message}`
      : `   ❌ ${yearlyResult.message}`
  );
  if (yearlyResult.details) {
    console.log(`      ${yearlyResult.details}`);
  }

  // 4. Verify Webhook
  console.log("\n4. Verifying Webhook Configuration...");
  const webhookResult = await verifyWebhook(stripe, "/stripe/webhook");
  results.push(webhookResult);
  console.log(
    webhookResult.success
      ? `   ✅ ${webhookResult.message}`
      : `   ❌ ${webhookResult.message}`
  );
  if (webhookResult.details) {
    console.log(`      ${webhookResult.details}`);
  }

  // 5. Check webhook secret
  console.log("\n5. Checking Webhook Secret...");
  if (webhookSecret) {
    console.log("   ✅ STRIPE_WEBHOOK_SECRET is set");
  } else {
    console.log("   ⚠️  STRIPE_WEBHOOK_SECRET is not set");
    console.log(
      "      Webhooks will fail without this. Get it from Stripe Dashboard > Webhooks > Your endpoint > Signing secret"
    );
  }

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  const failedCount = results.filter((r) => !r.success).length;
  const warningCount = webhookSecret ? 0 : 1;

  if (failedCount === 0 && warningCount === 0) {
    console.log("\n✅ All Stripe checks passed! Ready to deploy.\n");
    process.exit(0);
  } else if (failedCount === 0) {
    console.log(
      `\n⚠️  ${warningCount} warning(s). Review above and fix if needed.\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n❌ ${failedCount} check(s) failed. Fix the issues above before deploying.\n`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Script failed:", error);
  process.exit(1);
});
