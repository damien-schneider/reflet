import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SITE_URL: z.url().optional(),
    // GitHub OAuth configuration (optional - for user auth)
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // GitHub App configuration (optional - for org integration)
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_SLUG: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    // Google OAuth configuration (optional - for user auth)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Email verification toggle ("1" / "true" enables skip)
    SKIP_EMAIL_VERIFICATION: z.string().optional(),
    // Resend (transactional email)
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    // Stripe billing
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    // Convex site URL (used inside server actions calling back to convex http)
    CONVEX_SITE_URL: z.url().optional(),
    // Comma-separated list of super admin emails
    SUPER_ADMIN_EMAILS: z.string().optional(),
    // Vercel domain management (optional)
    VERCEL_API_TOKEN: z.string().optional(),
    VERCEL_TEAM_ID: z.string().optional(),
    VERCEL_PROJECT_ID: z.string().optional(),
    // Reflet SDK secret key (used in docs/examples)
    REFLET_SECRET_KEY: z.string().optional(),
    REFLET_BASE_URL: z.string().optional(),
    // Comma-separated list of additional trusted origins for auth CORS
    ADDITIONAL_TRUSTED_ORIGINS: z.string().optional(),
    // Autopilot E2E test bypass ("1" enables tier bypass)
    AUTOPILOT_E2E_BYPASS: z.string().optional(),
    // Web Push (VAPID) configuration
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    // Exa.ai search API key (optional)
    EXA_API_KEY: z.string().optional(),
    // ScrapeCreators API key (optional)
    SCRAPECREATORS_API_KEY: z.string().optional(),
    // Social automation integrations (optional)
    BUFFER_ACCESS_TOKEN: z.string().optional(),
    TYPEFULLY_API_KEY: z.string().optional(),
    // OpenRouter API key (optional - for AI features)
    OPENROUTER_API_KEY: z.string().optional(),
    // PostHog source maps upload (optional - for error tracking with unminified stack traces)
    POSTHOG_PERSONAL_API_KEY: z.string().optional(),
    POSTHOG_PROJECT_ID: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
