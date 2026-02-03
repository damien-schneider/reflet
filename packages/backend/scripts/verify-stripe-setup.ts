#!/usr/bin/env npx tsx

/**
 * Stripe Setup Verification Script
 *
 * This script verifies that Stripe is properly configured for the Reflet application.
 * Run this before `bun run convex deploy` to ensure billing will work correctly.
 *
 * Usage:
 *   bun run verify:stripe           # Test mode (uses .env.local with sk_test_...)
 *   bun run verify:stripe:prod      # Production mode (uses .env.production with sk_live_...)
 *
 * Required environment variables (same names in both files):
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_WEBHOOK_SECRET
 *   - STRIPE_PRICE_PRO_MONTHLY
 *   - STRIPE_PRICE_PRO_YEARLY
 */

import { config } from "dotenv";
import Stripe from "stripe";

// Load appropriate env file based on mode
const isProductionMode = process.env.STRIPE_MODE === "production";
config({ path: isProductionMode ? ".env.production" : ".env.local" });

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

interface EnvConfig {
  isProduction: boolean;
  modeLabel: string;
  stripeSecretKey: string | undefined;
  priceMonthly: string | undefined;
  priceYearly: string | undefined;
  webhookSecret: string | undefined;
}

function getEnvConfig(): EnvConfig {
  const isProduction = process.env.STRIPE_MODE === "production";

  return {
    isProduction,
    modeLabel: isProduction ? "PRODUCTION" : "TEST",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    priceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    priceYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

function logResult(result: VerificationResult): void {
  const icon = result.success ? "✅" : "❌";
  console.log(`   ${icon} ${result.message}`);
  if (result.details) {
    console.log(`      ${result.details}`);
  }
}

function printMissingKeyError(isProduction: boolean): void {
  console.log("\n❌ STRIPE_SECRET_KEY is not set");
  const envFile = isProduction ? ".env.production" : ".env.local";
  const keyType = isProduction ? "sk_live_..." : "sk_test_...";
  console.log(`   Add STRIPE_SECRET_KEY=${keyType} to ${envFile}\n`);
}

function warnKeyModeMismatch(
  stripeSecretKey: string,
  isProduction: boolean
): void {
  const isLiveKey = stripeSecretKey.startsWith("sk_live_");
  const isTestKey = stripeSecretKey.startsWith("sk_test_");

  if (isProduction && isTestKey) {
    console.log(
      "\n⚠️  WARNING: Running in PRODUCTION mode but using a TEST key (sk_test_...)"
    );
    console.log(
      "   Update STRIPE_SECRET_KEY in .env.production with sk_live_...\n"
    );
  } else if (!isProduction && isLiveKey) {
    console.log(
      "\n⚠️  WARNING: Running in TEST mode but using a LIVE key (sk_live_...)"
    );
    console.log(
      "   Use bun run verify:stripe:prod for production verification\n"
    );
  }
}

function printSummary(
  results: VerificationResult[],
  hasWebhookSecret: boolean
): void {
  console.log(`\n${"=".repeat(50)}`);
  const failedCount = results.filter((r) => !r.success).length;
  const warningCount = hasWebhookSecret ? 0 : 1;

  if (failedCount === 0 && warningCount === 0) {
    console.log("\n✅ All Stripe checks passed! Ready to deploy.\n");
    process.exit(0);
  }

  if (failedCount === 0) {
    console.log(
      `\n⚠️  ${warningCount} warning(s). Review above and fix if needed.\n`
    );
    process.exit(0);
  }

  console.log(
    `\n❌ ${failedCount} check(s) failed. Fix the issues above before deploying.\n`
  );
  process.exit(1);
}

async function main() {
  const config = getEnvConfig();

  console.log(
    `\n🔍 Verifying Stripe Setup for Reflet (${config.modeLabel} MODE)\n`
  );
  console.log("=".repeat(50));

  if (config.isProduction) {
    console.log("⚠️  Running in PRODUCTION mode - using live Stripe keys\n");
  }

  if (!config.stripeSecretKey) {
    printMissingKeyError(config.isProduction);
    process.exit(1);
  }

  warnKeyModeMismatch(config.stripeSecretKey, config.isProduction);

  const stripe = new Stripe(config.stripeSecretKey);
  const results: VerificationResult[] = [];

  // 1. Verify API key
  console.log("\n1. Verifying Stripe API Key...");
  const keyResult = await verifyStripeKey(stripe);
  results.push(keyResult);
  logResult(keyResult);

  if (!keyResult.success) {
    console.log("\n❌ Cannot continue without valid API key\n");
    process.exit(1);
  }

  // 2. Verify Pro Monthly price
  console.log("\n2. Verifying Pro Monthly Price...");
  const monthlyResult = await verifyPrice(
    stripe,
    config.priceMonthly ?? "",
    EXPECTED_PRICES.proMonthly,
    "Pro Monthly"
  );
  results.push(monthlyResult);
  logResult(monthlyResult);

  // 3. Verify Pro Yearly price
  console.log("\n3. Verifying Pro Yearly Price...");
  const yearlyResult = await verifyPrice(
    stripe,
    config.priceYearly ?? "",
    EXPECTED_PRICES.proYearly,
    "Pro Yearly"
  );
  results.push(yearlyResult);
  logResult(yearlyResult);

  // 4. Verify Webhook
  console.log("\n4. Verifying Webhook Configuration...");
  const webhookResult = await verifyWebhook(stripe, "/stripe/webhook");
  results.push(webhookResult);
  logResult(webhookResult);

  // 5. Check webhook secret
  console.log("\n5. Checking Webhook Secret...");
  if (config.webhookSecret) {
    console.log("   ✅ STRIPE_WEBHOOK_SECRET is set");
  } else {
    console.log("   ⚠️  STRIPE_WEBHOOK_SECRET is not set");
    console.log(
      "      Webhooks will fail without this. Get it from Stripe Dashboard > Webhooks > Your endpoint > Signing secret"
    );
  }

  printSummary(results, Boolean(config.webhookSecret));
}

main().catch((error) => {
  console.error("\n❌ Script failed:", error);
  process.exit(1);
});
